import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemorySaver, Command } from '@langchain/langgraph';
import { compileOrchestratorGraph } from '../graph.js';
import { createInitialRunState } from '../state.js';
import type { HitlInterruptPayload } from '../nodes/hitlTypes.js';

interface WithInterrupt {
  __interrupt__?: { value: unknown }[];
}

const baseConfig = {
  llmProvider: 'groq' as const,
  llmModel: 'llama-3',
  embeddingsProvider: 'voyage' as const,
  embeddingsModel: 'voyage-2',
  enableHITLAutomation: false,
};

function runConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

// Long enough / testable enough to pass the real @qa-agent/jev checks (content_quality, testable_requirement).
const VALID_RAW_TEXT =
  'The system shall allow a registered user to log in with valid credentials. ' +
  'When the user submits valid credentials, the system should validate them and display the dashboard. ' +
  'The system must reject invalid credentials and show an error message to the user.';

const REQUIREMENTS_COMPLETION = JSON.stringify({
  runId: 'placeholder',
  requirements: [
    {
      requirementId: 'REQ-001',
      title: 'Login',
      description: 'Users can log in with valid credentials.',
      testable: true,
      tags: ['auth'],
    },
  ],
});

const TESTCASES_COMPLETION = JSON.stringify({
  runId: 'placeholder',
  testCases: [
    {
      testCaseId: 'TC-001',
      title: 'Successful login with valid credentials',
      preconditions: ['A registered user account exists'],
      steps: ['Navigate to the login page', 'Enter valid credentials', 'Submit the form'],
      expectedResults: ['User is redirected to the dashboard'],
      traceability: ['REQ-001'],
      priority: 'high',
      tags: ['auth'],
    },
  ],
});

const AUTOMATION_COMPLETION = JSON.stringify({
  runId: 'placeholder',
  files: [
    {
      filename: 'login.spec.ts',
      testCaseIds: ['TC-001'],
      code: `import { test, expect } from '@playwright/test';\n\ntest('TC-001: Successful login with valid credentials', async ({ page }) => {\n  await page.goto('/login');\n  await page.fill('#username', 'user');\n  await page.fill('#password', 'pass');\n  await page.click('#submit');\n  await expect(page).toHaveURL('/dashboard');\n});\n`,
    },
  ],
});

describe('orchestrator graph', () => {
  let tempWorkspaceRoot: string;
  let previousWorkspaceRoot: string | undefined;
  let previousGroqKey: string | undefined;
  let previousTypesafeKey: string | undefined;

  beforeEach(() => {
    tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-orchestrator-'));
    previousWorkspaceRoot = process.env.WORKSPACE_ROOT;
    previousGroqKey = process.env.GROQ_API_KEY;
    previousTypesafeKey = process.env.TYPESAFE_API_KEY;
    process.env.WORKSPACE_ROOT = tempWorkspaceRoot;
    process.env.GROQ_API_KEY = 'test-key';
    // Force the heuristic JEV path here — a real TYPESAFE_API_KEY in the dev .env would otherwise
    // route jeve_validate through the LLM-shaped fetch mock below and break it. Setting it to ''
    // (not deleting) stops dotenv.config() from re-reading the real value off disk.
    process.env.TYPESAFE_API_KEY = '';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { messages: Array<{ role: string; content: string }> };
        const systemPrompt = body.messages.find((m) => m.role === 'system')?.content ?? '';
        const content = systemPrompt.includes('automation engineer')
          ? AUTOMATION_COMPLETION
          : systemPrompt.includes('test case designer')
            ? TESTCASES_COMPLETION
            : REQUIREMENTS_COMPLETION;
        return {
          ok: true,
          json: async () => ({ model: 'llama-3', choices: [{ message: { content } }] }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    if (previousWorkspaceRoot === undefined) delete process.env.WORKSPACE_ROOT;
    else process.env.WORKSPACE_ROOT = previousWorkspaceRoot;
    if (previousGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousGroqKey;
    if (previousTypesafeKey === undefined) process.env.TYPESAFE_API_KEY = '';
    else process.env.TYPESAFE_API_KEY = previousTypesafeKey;
  });

  it('drives a run through all stub nodes with a pause/resume cycle at every HITL gate', async () => {
    const graph = compileOrchestratorGraph(new MemorySaver());
    const config = runConfig('run-1');
    const initialState = createInitialRunState({ runId: 'run-1', config: baseConfig, rawText: VALID_RAW_TEXT });

    const afterRequirements = await graph.invoke(initialState, config);
    expect(afterRequirements.status).toBe('waiting_hitl');
    expect(afterRequirements.currentPhase).toBe('hitl_requirements');
    const interrupt1 = (afterRequirements as WithInterrupt).__interrupt__?.[0]?.value as HitlInterruptPayload;
    expect(interrupt1.phase).toBe('hitl_requirements');

    const afterTestcases = await graph.invoke(
      new Command({ resume: { decision: 'approved' } }),
      config,
    );
    expect(afterTestcases.status).toBe('waiting_hitl');
    expect(afterTestcases.currentPhase).toBe('hitl_testcases');
    expect(afterTestcases.requirements.hitlStatus).toBe('approved');

    const afterAutomation = await graph.invoke(new Command({ resume: { decision: 'approved' } }), config);
    // enableHITLAutomation is false, so agent3_automation skips hitl_automation and runs to completion.
    // The generated spec navigates to '/login' with no baseURL/target app running, so it genuinely fails,
    // and finalize_run correctly marks the overall run 'failed'.
    expect(afterAutomation.status).toBe('failed');
    expect(afterAutomation.currentPhase).toBe('finalize_run');
    expect(afterAutomation.testCases.hitlStatus).toBe('approved');
    expect(afterAutomation.automation.generatedTestFiles).toHaveLength(1);
    expect(afterAutomation.execution.summary).toEqual({ total: 1, passed: 0, failed: 1 });
  }, 30000);

  it('pauses at hitl_automation when enableHITLAutomation is true', async () => {
    const graph = compileOrchestratorGraph(new MemorySaver());
    const config = runConfig('run-2');
    const initialState = createInitialRunState({
      runId: 'run-2',
      config: { ...baseConfig, enableHITLAutomation: true },
      rawText: VALID_RAW_TEXT,
    });

    await graph.invoke(initialState, config);
    await graph.invoke(new Command({ resume: { decision: 'approved' } }), config);
    const afterTestcases = await graph.invoke(new Command({ resume: { decision: 'approved' } }), config);
    expect(afterTestcases.status).toBe('waiting_hitl');
    expect(afterTestcases.currentPhase).toBe('hitl_automation');

    const final = await graph.invoke(new Command({ resume: { decision: 'approved' } }), config);
    // Same genuine test failure as above (no baseURL/target app) -> finalize_run marks the run 'failed'.
    expect(final.status).toBe('failed');
    expect(final.automation.hitlStatus).toBe('approved');
  }, 30000);

  it('stops with rejected status when a HITL gate is rejected', async () => {
    const graph = compileOrchestratorGraph(new MemorySaver());
    const config = runConfig('run-3');
    const initialState = createInitialRunState({ runId: 'run-3', config: baseConfig, rawText: VALID_RAW_TEXT });

    await graph.invoke(initialState, config);
    const afterReject = await graph.invoke(
      new Command({ resume: { decision: 'rejected', comments: 'missing detail' } }),
      config,
    );

    expect(afterReject.status).toBe('rejected');
    expect(afterReject.requirements.hitlStatus).toBe('rejected');
    expect(afterReject.requirements.hitlComments).toBe('missing detail');
    expect((afterReject as WithInterrupt).__interrupt__ ?? []).toHaveLength(0);
  });

  it('fails fast when JEV validation rejects the input', async () => {
    const graph = compileOrchestratorGraph(new MemorySaver());
    const config = runConfig('run-4');
    const initialState = createInitialRunState({
      runId: 'run-4',
      config: baseConfig,
      rawText: 'JEV_REJECT this input',
    });

    const result = await graph.invoke(initialState, config);
    expect(result.status).toBe('failed');
    expect(result.currentPhase).toBe('jeve_validate');
    expect(result.jeve.valid).toBe(false);
  });
});
