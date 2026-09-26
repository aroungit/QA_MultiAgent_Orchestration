import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agent2Testcases } from '../nodes/agent2Testcases.js';
import { createInitialRunState } from '../state.js';
import { writeRunArtifact } from '../workspace.js';

const baseConfig = {
  llmProvider: 'groq' as const,
  llmModel: 'llama-3',
  embeddingsProvider: 'voyage' as const,
  embeddingsModel: 'voyage-2',
  enableHITLAutomation: false,
};

function mockGroqResponse(content: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'llama-3', choices: [{ message: { content } }] }),
    }),
  );
}

const REQUIREMENTS_DOC = {
  runId: 'run-agent2',
  requirements: [
    {
      requirementId: 'REQ-001',
      title: 'Login',
      description: 'Users can log in with valid credentials.',
      testable: true,
      tags: ['auth'],
    },
    {
      requirementId: 'REQ-002',
      title: 'Timeout',
      description: 'Sessions expire after 30 minutes of inactivity.',
      testable: true,
      tags: ['auth', 'session'],
    },
  ],
};

function buildStateWithApprovedRequirements() {
  writeRunArtifact('run-agent2', 'requirements', 'requirements.json', JSON.stringify(REQUIREMENTS_DOC));
  const state = createInitialRunState({ runId: 'run-agent2', config: baseConfig, rawText: 'irrelevant' });
  state.requirements.requirementsJsonPath = 'workspace/run-agent2/requirements/requirements.json';
  return state;
}

describe('agent2Testcases', () => {
  let tempWorkspaceRoot: string;
  let previousWorkspaceRoot: string | undefined;
  let previousGroqKey: string | undefined;

  beforeEach(() => {
    tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-agent2-'));
    previousWorkspaceRoot = process.env.WORKSPACE_ROOT;
    previousGroqKey = process.env.GROQ_API_KEY;
    process.env.WORKSPACE_ROOT = tempWorkspaceRoot;
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    if (previousWorkspaceRoot === undefined) delete process.env.WORKSPACE_ROOT;
    else process.env.WORKSPACE_ROOT = previousWorkspaceRoot;
    if (previousGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousGroqKey;
  });

  it('parses a valid LLM response into testcases.json/testcases_summary.md and hands off to HITL', async () => {
    mockGroqResponse(
      JSON.stringify({
        runId: 'ignored-should-be-overwritten',
        testCases: [
          {
            testCaseId: 'TC-001',
            title: 'Successful login',
            preconditions: ['A registered account exists'],
            steps: ['Go to login page', 'Enter valid credentials', 'Submit'],
            expectedResults: ['User is redirected to dashboard'],
            traceability: ['REQ-001'],
            priority: 'high',
            tags: ['auth'],
          },
          {
            testCaseId: 'TC-002',
            title: 'Session expires after inactivity',
            preconditions: ['User is logged in'],
            steps: ['Log in', 'Wait 30 minutes without activity', 'Attempt an action'],
            expectedResults: ['User is logged out and redirected to login'],
            traceability: ['REQ-002'],
            priority: 'medium',
            tags: ['auth', 'session'],
          },
        ],
      }),
    );

    const state = buildStateWithApprovedRequirements();
    const update = await agent2Testcases(state);

    expect(update.status).toBe('waiting_hitl');
    expect(update.currentPhase).toBe('hitl_testcases');
    expect(update.testCases?.hitlStatus).toBe('pending');

    const jsonPath = update.testCases?.testCasesJsonPath;
    const summaryPath = update.testCases?.summaryMarkdownPath;
    expect(jsonPath).toBe('workspace/run-agent2/testcases/testcases.json');
    expect(summaryPath).toBe('workspace/run-agent2/testcases/testcases_summary.md');

    const writtenJson = JSON.parse(
      fs.readFileSync(path.join(tempWorkspaceRoot, 'run-agent2', 'testcases', 'testcases.json'), 'utf-8'),
    );
    expect(writtenJson.runId).toBe('run-agent2');
    expect(writtenJson.testCases).toHaveLength(2);

    const writtenSummary = fs.readFileSync(
      path.join(tempWorkspaceRoot, 'run-agent2', 'testcases', 'testcases_summary.md'),
      'utf-8',
    );
    expect(writtenSummary).toContain('TC-001: Successful login');
    expect(writtenSummary).toContain('TC-002: Session expires after inactivity');
  });

  it('throws when there is no approved requirements.json to consume', async () => {
    const state = createInitialRunState({ runId: 'run-no-reqs', config: baseConfig, rawText: 'irrelevant' });
    await expect(agent2Testcases(state)).rejects.toThrow(/no approved requirements\.json/);
  });

  it('throws when the LLM response is not valid JSON', async () => {
    mockGroqResponse('this is not json at all');
    const state = buildStateWithApprovedRequirements();
    await expect(agent2Testcases(state)).rejects.toThrow();
  });

  it('throws when the LLM response does not match the test cases schema', async () => {
    mockGroqResponse(JSON.stringify({ testCases: [{ title: 'missing required fields' }] }));
    const state = buildStateWithApprovedRequirements();
    await expect(agent2Testcases(state)).rejects.toThrow();
  });

  it('throws when a test case traces to an unknown requirement id', async () => {
    mockGroqResponse(
      JSON.stringify({
        testCases: [
          {
            testCaseId: 'TC-001',
            title: 'Bogus traceability',
            preconditions: [],
            steps: ['Do something'],
            expectedResults: ['Something happens'],
            traceability: ['REQ-999'],
            priority: 'medium',
            tags: [],
          },
        ],
      }),
    );
    const state = buildStateWithApprovedRequirements();
    await expect(agent2Testcases(state)).rejects.toThrow(/unknown requirement/);
  });
});
