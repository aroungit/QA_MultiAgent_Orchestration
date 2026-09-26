import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { openDatabase } from '../client.js';
import {
  addRunFile,
  createRun,
  getLatestJeveResult,
  getRun,
  getRunInput,
  listHitlDecisions,
  listRunFiles,
  listRuns,
  recordHitlDecision,
  recordJeveResult,
  updateRunStatus,
} from '../repository.js';
import type { RunConfig } from '@qa-agent/shared';

const sampleConfig: RunConfig = {
  llmProvider: 'groq',
  llmModel: 'llama-3.1-70b-versatile',
  embeddingsProvider: 'voyage',
  embeddingsModel: 'voyage-3',
  enableHITLAutomation: false,
};

describe('repository', () => {
  let db: Database.Database;
  let tempWorkspaceRoot: string;
  let previousWorkspaceRoot: string | undefined;

  beforeEach(() => {
    db = openDatabase(':memory:');
    tempWorkspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-workspace-'));
    previousWorkspaceRoot = process.env.WORKSPACE_ROOT;
    process.env.WORKSPACE_ROOT = tempWorkspaceRoot;
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

  it('creates a run, its input row, and workspace folders', () => {
    const run = createRun(db, { config: sampleConfig, rawText: 'raw requirements text' });

    expect(run.status).toBe('created');
    expect(run.currentPhase).toBeNull();

    const fetched = getRun(db, run.id);
    expect(fetched).toEqual(run);

    const input = getRunInput(db, run.id);
    expect(input?.rawText).toBe('raw requirements text');

    for (const sub of ['inputs', 'requirements', 'testcases', 'tests', 'execution']) {
      expect(fs.existsSync(path.join(tempWorkspaceRoot, run.id, sub))).toBe(true);
    }
  });

  it('lists runs ordered by most recent first', () => {
    const first = createRun(db, { config: sampleConfig });
    const second = createRun(db, { config: sampleConfig });

    const runs = listRuns(db);
    expect(runs.map((r) => r.id)).toEqual([second.id, first.id]);
  });

  it('updates run status and current phase', () => {
    const run = createRun(db, { config: sampleConfig });
    const updated = updateRunStatus(db, run.id, { status: 'waiting_hitl', currentPhase: 'hitl_requirements' });

    expect(updated.status).toBe('waiting_hitl');
    expect(updated.currentPhase).toBe('hitl_requirements');
    expect(getRun(db, run.id)?.status).toBe('waiting_hitl');
  });

  it('adds and lists run files, optionally filtered by type', () => {
    const run = createRun(db, { config: sampleConfig });
    addRunFile(db, run.id, { name: 'requirements.json', path: 'requirements/requirements.json', type: 'requirements_json' });
    addRunFile(db, run.id, { name: 'summary.md', path: 'requirements/summary.md', type: 'requirements_summary' });

    expect(listRunFiles(db, run.id)).toHaveLength(2);
    expect(listRunFiles(db, run.id, 'requirements_json')).toHaveLength(1);
  });

  it('records and lists hitl decisions', () => {
    const run = createRun(db, { config: sampleConfig });
    recordHitlDecision(db, run.id, { phase: 'hitl_requirements', decision: 'approved', comments: 'looks good' });

    const decisions = listHitlDecisions(db, run.id);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ phase: 'hitl_requirements', decision: 'approved', comments: 'looks good' });
  });

  it('records and retrieves the latest jeve result', () => {
    const run = createRun(db, { config: sampleConfig });
    recordJeveResult(db, run.id, { valid: false, errors: [{ code: 'pii_detected' }] });
    recordJeveResult(db, run.id, {
      valid: true,
      normalizedInput: { rawText: 'clean text' },
      decisions: [{ name: 'structure_ok', probability: 0.9, outcome: 'accept' }],
    });

    const latest = getLatestJeveResult(db, run.id);
    expect(latest?.valid).toBe(true);
    expect(latest?.normalizedInput).toEqual({ rawText: 'clean text' });
    expect(latest?.decisions).toEqual([{ name: 'structure_ok', probability: 0.9, outcome: 'accept' }]);
  });

  it('throws when updating a run that does not exist', () => {
    expect(() => updateRunStatus(db, 'missing-run-id', { status: 'failed' })).toThrow();
  });
});
