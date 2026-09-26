import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agent1Requirements } from '../nodes/agent1Requirements.js';
import { createInitialRunState } from '../state.js';

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

describe('agent1Requirements', () => {
  let tempWorkspaceRoot: string;
  let previousWorkspaceRoot: string | undefined;
  let previousGroqKey: string | undefined;

  beforeEach(() => {
    tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-agent1-'));
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

  it('parses a valid LLM response into requirements.json/summary.md and hands off to HITL', async () => {
    mockGroqResponse(
      '```json\n' +
        JSON.stringify({
          runId: 'ignored-should-be-overwritten',
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
        }) +
        '\n```',
    );

    const state = createInitialRunState({
      runId: 'run-agent1',
      config: baseConfig,
      rawText: 'Users log in and sessions expire after 30 minutes.',
    });

    const update = await agent1Requirements(state);

    expect(update.status).toBe('waiting_hitl');
    expect(update.currentPhase).toBe('hitl_requirements');
    expect(update.requirements?.hitlStatus).toBe('pending');

    const jsonPath = update.requirements?.requirementsJsonPath;
    const summaryPath = update.requirements?.summaryMarkdownPath;
    expect(jsonPath).toBe('workspace/run-agent1/requirements/requirements.json');
    expect(summaryPath).toBe('workspace/run-agent1/requirements/summary.md');

    const writtenJson = JSON.parse(
      fs.readFileSync(path.join(tempWorkspaceRoot, 'run-agent1', 'requirements', 'requirements.json'), 'utf-8'),
    );
    expect(writtenJson.runId).toBe('run-agent1');
    expect(writtenJson.requirements).toHaveLength(2);

    const writtenSummary = fs.readFileSync(
      path.join(tempWorkspaceRoot, 'run-agent1', 'requirements', 'summary.md'),
      'utf-8',
    );
    expect(writtenSummary).toContain('REQ-001: Login');
    expect(writtenSummary).toContain('REQ-002: Timeout');
  });

  it('throws when the run has no raw text input', async () => {
    const state = createInitialRunState({ runId: 'run-no-input', config: baseConfig });
    await expect(agent1Requirements(state)).rejects.toThrow(/no raw text input/);
  });

  it('throws when the LLM response is not valid JSON', async () => {
    mockGroqResponse('this is not json at all');
    const state = createInitialRunState({ runId: 'run-bad-json', config: baseConfig, rawText: 'some requirement' });
    await expect(agent1Requirements(state)).rejects.toThrow();
  });

  it('throws when the LLM response does not match the requirements schema', async () => {
    mockGroqResponse(JSON.stringify({ requirements: [{ title: 'missing required fields' }] }));
    const state = createInitialRunState({ runId: 'run-bad-schema', config: baseConfig, rawText: 'some requirement' });
    await expect(agent1Requirements(state)).rejects.toThrow();
  });
});
