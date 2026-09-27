import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agent3Automation } from '../nodes/agent3Automation.js';
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

const TEST_CASES_DOC = {
  runId: 'run-agent3',
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
};

const VALID_SPEC_CODE = `import { test, expect } from '@playwright/test';

test('TC-001: Successful login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'user');
  await page.fill('#password', 'pass');
  await page.click('#submit');
  await expect(page).toHaveURL('/dashboard');
});

test('TC-002: Session expires after inactivity', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'user');
  await page.fill('#password', 'pass');
  await page.click('#submit');
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL('/login');
});
`;

function buildStateWithApprovedTestCases(enableHITLAutomation = false) {
  writeRunArtifact('run-agent3', 'testcases', 'testcases.json', JSON.stringify(TEST_CASES_DOC));
  const state = createInitialRunState({
    runId: 'run-agent3',
    config: { ...baseConfig, enableHITLAutomation },
    rawText: 'irrelevant',
  });
  state.testCases.testCasesJsonPath = 'workspace/run-agent3/testcases/testcases.json';
  return state;
}

describe('agent3Automation', () => {
  let tempWorkspaceRoot: string;
  let previousWorkspaceRoot: string | undefined;
  let previousGroqKey: string | undefined;

  beforeEach(() => {
    tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-agent3-'));
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

  it('parses a valid LLM response into spec files and proceeds straight to execution when HITL automation is disabled', async () => {
    mockGroqResponse(
      JSON.stringify({
        runId: 'ignored-should-be-overwritten',
        files: [{ filename: 'login.spec.ts', testCaseIds: ['TC-001', 'TC-002'], code: VALID_SPEC_CODE }],
      }),
    );

    const state = buildStateWithApprovedTestCases(false);
    const update = await agent3Automation(state);

    expect(update.status).toBe('running');
    expect(update.currentPhase).toBe('execute_tests');
    expect(update.automation?.hitlStatus).toBeUndefined();
    expect(update.automation?.generatedTestFiles).toEqual(['workspace/run-agent3/tests/login.spec.ts']);

    const writtenCode = fs.readFileSync(
      path.join(tempWorkspaceRoot, 'run-agent3', 'tests', 'login.spec.ts'),
      'utf-8',
    );
    expect(writtenCode).toBe(VALID_SPEC_CODE);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(tempWorkspaceRoot, 'run-agent3', 'tests', 'automation_manifest.json'), 'utf-8'),
    );
    expect(manifest.runId).toBe('run-agent3');
  });

  it('routes to hitl_automation when config.enableHITLAutomation is true', async () => {
    mockGroqResponse(
      JSON.stringify({
        files: [{ filename: 'login.spec.ts', testCaseIds: ['TC-001', 'TC-002'], code: VALID_SPEC_CODE }],
      }),
    );

    const state = buildStateWithApprovedTestCases(true);
    const update = await agent3Automation(state);

    expect(update.status).toBe('waiting_hitl');
    expect(update.currentPhase).toBe('hitl_automation');
    expect(update.automation?.hitlStatus).toBe('pending');
  });

  it('normalizes codeLines and singular legacy file fields from the LLM', async () => {
    mockGroqResponse(
      JSON.stringify({
        files: [{ fileName: 'login.spec.ts', testCaseId: 'TC-001', testCaseIds: ['TC-001', 'TC-002'], codeLines: VALID_SPEC_CODE.split('\n') }],
      }),
    );

    const update = await agent3Automation(buildStateWithApprovedTestCases());

    expect(update.automation?.generatedTestFiles).toEqual(['workspace/run-agent3/tests/login.spec.ts']);
  });

  it('renames duplicate generated filenames across batches instead of failing the run', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_input, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as { messages?: Array<{ content?: string }> };
        const prompt = body.messages?.[1]?.content ?? '';
        const testCaseIds = prompt.includes('TC-003')
          ? ['TC-003', 'TC-004']
          : ['TC-001', 'TC-002'];

        return {
          ok: true,
          json: async () => ({
            model: 'llama-3',
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    files: [
                      {
                        filename: 'transferValidation.spec.ts',
                        testCaseIds,
                        code: VALID_SPEC_CODE,
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        };
      }),
    );

    const originalBatchSize = TEST_CASES_DOC.testCases.length;
    TEST_CASES_DOC.testCases.push({
      testCaseId: 'TC-003',
      title: 'Transfer confirmation reference is shown',
      preconditions: ['User completed a valid transfer'],
      steps: ['Submit valid transfer', 'Confirm transfer'],
      expectedResults: ['Reference number is displayed'],
      traceability: ['REQ-003'],
      priority: 'medium',
      tags: ['transfer'],
    });
    TEST_CASES_DOC.testCases.push({
      testCaseId: 'TC-004',
      title: 'Transfer appears in recent activity',
      preconditions: ['User completed a valid transfer'],
      steps: ['Open recent activity'],
      expectedResults: ['Transfer is listed'],
      traceability: ['REQ-004'],
      priority: 'medium',
      tags: ['transfer'],
    });

    try {
      const update = await agent3Automation(buildStateWithApprovedTestCases());

      expect(update.automation?.generatedTestFiles).toEqual([
        'workspace/run-agent3/tests/transferValidation.spec.ts',
        'workspace/run-agent3/tests/transferValidation-2.spec.ts',
      ]);
    } finally {
      TEST_CASES_DOC.testCases.splice(originalBatchSize);
    }
  });

  it('throws when there is no approved testcases.json to consume', async () => {
    const state = createInitialRunState({ runId: 'run-no-tcs', config: baseConfig, rawText: 'irrelevant' });
    await expect(agent3Automation(state)).rejects.toThrow(/no approved testcases\.json/);
  });

  it('throws when the LLM response is not valid JSON', async () => {
    mockGroqResponse('this is not json at all');
    const state = buildStateWithApprovedTestCases();
    await expect(agent3Automation(state)).rejects.toThrow();
  });

  it('throws when the LLM response does not match the automation schema', async () => {
    mockGroqResponse(JSON.stringify({ files: [{ filename: 'no-code.spec.ts' }] }));
    const state = buildStateWithApprovedTestCases();
    await expect(agent3Automation(state)).rejects.toThrow();
  });

  it('throws when a generated file traces to an unknown test case id', async () => {
    mockGroqResponse(
      JSON.stringify({
        files: [{ filename: 'login.spec.ts', testCaseIds: ['TC-999'], code: VALID_SPEC_CODE }],
      }),
    );
    const state = buildStateWithApprovedTestCases();
    await expect(agent3Automation(state)).rejects.toThrow(/unknown test case/);
  });

  it('throws when a test case is not automated by any generated file', async () => {
    mockGroqResponse(
      JSON.stringify({
        files: [{ filename: 'login.spec.ts', testCaseIds: ['TC-001'], code: VALID_SPEC_CODE }],
      }),
    );
    const state = buildStateWithApprovedTestCases();
    await expect(agent3Automation(state)).rejects.toThrow(/is not automated by any generated file/);
  });

  it('throws when a generated file is not syntactically valid TypeScript', async () => {
    mockGroqResponse(
      JSON.stringify({
        files: [
          {
            filename: 'broken.spec.ts',
            testCaseIds: ['TC-001', 'TC-002'],
            code: "import { test } from '@playwright/test';\n\ntest('broken' async ({ page }) => {",
          },
        ],
      }),
    );
    const state = buildStateWithApprovedTestCases();
    await expect(agent3Automation(state)).rejects.toThrow(/not valid TypeScript/);
  });
});
