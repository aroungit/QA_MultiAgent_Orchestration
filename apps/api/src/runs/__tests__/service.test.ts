import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Database from 'better-sqlite3';
import type { HitlPhase, RunConfig } from '@qa-agent/shared';
import { openDatabase } from '../../db/client.js';
import * as repo from '../../db/repository.js';
import { getArtifact, resumeRun } from '../service.js';

const invokeMock = vi.fn();
const getStateMock = vi.fn();

vi.mock('../../orchestrator/runtime.js', () => ({
  getOrchestratorGraph: () => ({ invoke: invokeMock }),
  getOrchestratorState: (...args: unknown[]) => getStateMock(...args),
  threadConfig: (runId: string) => ({ configurable: { thread_id: runId } }),
}));

const sampleConfig: RunConfig = {
  llmProvider: 'groq',
  llmModel: 'llama-3.1-70b-versatile',
  embeddingsProvider: 'voyage',
  embeddingsModel: 'voyage-3',
  enableHITLAutomation: true,
  executionBackend: 'local',
};

interface PhaseFixture {
  phase: HitlPhase;
  stateKey: 'requirements' | 'testCases' | 'automation';
  artifactPath: string;
  extraPaths?: string[];
}

const PHASE_FIXTURES: PhaseFixture[] = [
  {
    phase: 'hitl_requirements',
    stateKey: 'requirements',
    artifactPath: 'workspace/run-1/requirements/requirements.v2.json',
    extraPaths: ['workspace/run-1/requirements/summary.v2.md'],
  },
  {
    phase: 'hitl_testcases',
    stateKey: 'testCases',
    artifactPath: 'workspace/run-1/testcases/testcases.v2.json',
    extraPaths: ['workspace/run-1/testcases/testcases_summary.v2.md'],
  },
  {
    phase: 'hitl_automation',
    stateKey: 'automation',
    artifactPath: 'workspace/run-1/tests/login.v2.spec.ts',
  },
];

describe('runs service resumeRun', () => {
  let db: Database.Database;
  let tempWorkspaceRoot: string;
  let previousWorkspaceRoot: string | undefined;

  beforeEach(() => {
    db = openDatabase(':memory:');
    tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-service-'));
    previousWorkspaceRoot = process.env.WORKSPACE_ROOT;
    process.env.WORKSPACE_ROOT = tempWorkspaceRoot;
    invokeMock.mockReset();
    getStateMock.mockReset();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tempWorkspaceRoot, { recursive: true, force: true });
    if (previousWorkspaceRoot === undefined) {
      delete process.env.WORKSPACE_ROOT;
    } else {
      process.env.WORKSPACE_ROOT = previousWorkspaceRoot;
    }
  });

  it.each(PHASE_FIXTURES)('records rejection feedback and keeps %s at the same HITL gate', async ({ phase, stateKey, artifactPath, extraPaths = [] }) => {
    const run = repo.createRun(db, { config: sampleConfig, rawText: 'Valid login requirements for reviewer loop coverage.' });
    repo.updateRunStatus(db, run.id, { status: 'waiting_hitl', currentPhase: phase });
    const priorPath = artifactPath.replace('.v2', '');
    repo.addRunFile(db, run.id, {
      name: path.basename(priorPath),
      path: priorPath,
      type: stateKey === 'automation' ? 'test_file' : stateKey === 'requirements' ? 'requirements_json' : 'testcases_json',
      phase: stateKey === 'requirements' ? 'agent1_requirements' : stateKey === 'testCases' ? 'agent2_testcases' : 'agent3_automation',
    });

    const regeneratedState = buildRejectedState(run.id, phase, stateKey, artifactPath, extraPaths);
    invokeMock.mockResolvedValue(regeneratedState);
    getStateMock.mockResolvedValue(regeneratedState);

    const detail = await resumeRun(db, run.id, phase, 'rejected', 'Needs another pass');

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(detail.run.status).toBe('waiting_hitl');
    expect(detail.run.currentPhase).toBe(phase);
    expect(detail.state?.status).toBe('waiting_hitl');
    expect(detail.state?.currentPhase).toBe(phase);
    expect(repo.listHitlDecisions(db, run.id)).toEqual([
      expect.objectContaining({ phase, decision: 'rejected', comments: 'Needs another pass' }),
    ]);

    const latestFiles = repo.listRunFiles(db, run.id).map((file) => file.path);
    expect(latestFiles).toContain(artifactPath);
    for (const extraPath of extraPaths) {
      expect(latestFiles).toContain(extraPath);
    }
  });

  it('serves legacy report_html rows that were stored as report.html while the real report lives under execution/html', async () => {
    const run = repo.createRun(db, { config: sampleConfig, rawText: 'Valid login requirements for report lookup coverage.' });
    const htmlDir = path.join(tempWorkspaceRoot, run.id, 'execution', 'html');
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, 'index.html'), '<html><body>report</body></html>', 'utf-8');
    repo.addRunFile(db, run.id, {
      name: 'report.html',
      path: `workspace/${run.id}/execution/html/index.html`,
      type: 'report_html',
      phase: 'execute_tests',
    });

    const artifact = await getArtifact(db, run.id, 'report_html');

    expect(artifact?.contentType).toBe('text/html');
    expect(artifact?.filename).toBe('index.html');
    expect(artifact?.content.toString('utf-8')).toContain('report');
  });
});

function buildRejectedState(
  runId: string,
  phase: HitlPhase,
  stateKey: PhaseFixture['stateKey'],
  artifactPath: string,
  extraPaths: string[],
) {
  const baseState = {
    runId,
    status: 'waiting_hitl',
    currentPhase: phase,
    config: sampleConfig,
    input: { rawText: 'Valid login requirements for reviewer loop coverage.', files: [] },
    jeve: { valid: true, decisions: [], normalizedInput: { rawText: 'Valid login requirements for reviewer loop coverage.' } },
    requirements: { hitlStatus: 'pending', revision: 1 },
    testCases: { hitlStatus: 'pending', revision: 1 },
    automation: { hitlStatus: 'pending', revision: 1, generatedTestFiles: [] },
    execution: {},
  };

  if (stateKey === 'requirements') {
    return {
      ...baseState,
      requirements: {
        requirementsJsonPath: artifactPath,
        summaryMarkdownPath: extraPaths[0],
        hitlStatus: 'pending',
        revision: 2,
        regenerationHistory: [
          {
            iteration: 1,
            comments: 'Needs another pass',
            artifactPaths: ['workspace/run-1/requirements/requirements.json'],
          },
        ],
      },
    };
  }

  if (stateKey === 'testCases') {
    return {
      ...baseState,
      requirements: {
        requirementsJsonPath: 'workspace/run-1/requirements/requirements.json',
        summaryMarkdownPath: 'workspace/run-1/requirements/summary.md',
        hitlStatus: 'approved',
        revision: 1,
      },
      testCases: {
        testCasesJsonPath: artifactPath,
        summaryMarkdownPath: extraPaths[0],
        hitlStatus: 'pending',
        revision: 2,
        regenerationHistory: [
          {
            iteration: 1,
            comments: 'Needs another pass',
            artifactPaths: ['workspace/run-1/testcases/testcases.json'],
          },
        ],
      },
    };
  }

  return {
    ...baseState,
    requirements: {
      requirementsJsonPath: 'workspace/run-1/requirements/requirements.json',
      summaryMarkdownPath: 'workspace/run-1/requirements/summary.md',
      hitlStatus: 'approved',
      revision: 1,
    },
    testCases: {
      testCasesJsonPath: 'workspace/run-1/testcases/testcases.json',
      summaryMarkdownPath: 'workspace/run-1/testcases/testcases_summary.md',
      hitlStatus: 'approved',
      revision: 1,
    },
    automation: {
      generatedTestFiles: [artifactPath],
      manifestPath: extraPaths[0],
      hitlStatus: 'pending',
      revision: 2,
      regenerationHistory: [
        {
          iteration: 1,
          comments: 'Needs another pass',
          artifactPaths: ['workspace/run-1/tests/login.spec.ts'],
        },
      ],
    },
  };
}