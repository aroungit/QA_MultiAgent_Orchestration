import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ExecutionSummary, HitlPhase, JeveDecision, Phase, RunConfig, RunStatus } from '@qa-agent/shared';
import { createRunWorkspace } from '../workspace/fs.js';
import type {
  HitlDecisionRecord,
  HitlDecisionValue,
  JeveResultRecord,
  RunFileRecord,
  RunInputRecord,
  RunRecord,
} from './types.js';

interface RunRow {
  id: string;
  status: string;
  current_phase: string | null;
  config_json: string;
  execution_summary_json: string | null;
  created_at: string;
  updated_at: string;
}

interface RunInputRow {
  id: string;
  run_id: string;
  raw_text: string | null;
  created_at: string;
}

interface RunFileRow {
  id: string;
  run_id: string;
  name: string;
  path: string;
  type: string;
  phase: string | null;
  created_at: string;
}

interface HitlDecisionRow {
  id: string;
  run_id: string;
  phase: string;
  decision: string;
  comments: string | null;
  decided_at: string;
}

interface JeveResultRow {
  id: string;
  run_id: string;
  valid: number;
  decisions_json: string | null;
  errors_json: string | null;
  normalized_input_json: string | null;
  created_at: string;
}

function mapRun(row: RunRow): RunRecord {
  return {
    id: row.id,
    status: row.status as RunStatus,
    currentPhase: row.current_phase as Phase | null,
    config: JSON.parse(row.config_json) as RunConfig,
    executionSummary: row.execution_summary_json ? (JSON.parse(row.execution_summary_json) as ExecutionSummary) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRunInput(row: RunInputRow): RunInputRecord {
  return { id: row.id, runId: row.run_id, rawText: row.raw_text, createdAt: row.created_at };
}

function mapRunFile(row: RunFileRow): RunFileRecord {
  return {
    id: row.id,
    runId: row.run_id,
    name: row.name,
    path: row.path,
    type: row.type,
    phase: row.phase as Phase | null,
    createdAt: row.created_at,
  };
}

function mapHitlDecision(row: HitlDecisionRow): HitlDecisionRecord {
  return {
    id: row.id,
    runId: row.run_id,
    phase: row.phase as HitlPhase,
    decision: row.decision as HitlDecisionValue,
    comments: row.comments,
    decidedAt: row.decided_at,
  };
}

function mapJeveResult(row: JeveResultRow): JeveResultRecord {
  return {
    id: row.id,
    runId: row.run_id,
    valid: row.valid === 1,
    decisions: row.decisions_json ? (JSON.parse(row.decisions_json) as JeveDecision[]) : null,
    errors: row.errors_json ? (JSON.parse(row.errors_json) as unknown[]) : null,
    normalizedInput: row.normalized_input_json ? JSON.parse(row.normalized_input_json) : null,
    createdAt: row.created_at,
  };
}

export interface CreateRunParams {
  config: RunConfig;
  rawText?: string;
  status?: RunStatus;
}

/** Inserts a new run (+ optional raw-text input) and provisions its workspace folders. */
export function createRun(db: Database.Database, params: CreateRunParams): RunRecord {
  const id = randomUUID();
  const now = new Date().toISOString();
  const status: RunStatus = params.status ?? 'created';

  db.prepare(
    `INSERT INTO runs (id, status, current_phase, config_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, status, null, JSON.stringify(params.config), now, now);

  if (params.rawText !== undefined) {
    db.prepare(
      `INSERT INTO run_inputs (id, run_id, raw_text, created_at) VALUES (?, ?, ?, ?)`,
    ).run(randomUUID(), id, params.rawText, now);
  }

  createRunWorkspace(id);

  return {
    id,
    status,
    currentPhase: null,
    config: params.config,
    executionSummary: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getRun(db: Database.Database, runId: string): RunRecord | undefined {
  const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as RunRow | undefined;
  return row ? mapRun(row) : undefined;
}

export function listRuns(db: Database.Database): RunRecord[] {
  const rows = db.prepare('SELECT * FROM runs ORDER BY created_at DESC, rowid DESC').all() as RunRow[];
  return rows.map(mapRun);
}

export interface UpdateRunStatusParams {
  status?: RunStatus;
  currentPhase?: Phase | null;
}

export function updateRunStatus(
  db: Database.Database,
  runId: string,
  updates: UpdateRunStatusParams,
): RunRecord {
  const existing = getRun(db, runId);
  if (!existing) {
    throw new Error(`Run not found: ${runId}`);
  }
  const status = updates.status ?? existing.status;
  const currentPhase = updates.currentPhase !== undefined ? updates.currentPhase : existing.currentPhase;
  const now = new Date().toISOString();

  db.prepare('UPDATE runs SET status = ?, current_phase = ?, updated_at = ? WHERE id = ?').run(
    status,
    currentPhase,
    now,
    runId,
  );

  return { ...existing, status, currentPhase, updatedAt: now };
}

export function updateRunConfig(db: Database.Database, runId: string, config: RunConfig): RunRecord {
  const existing = getRun(db, runId);
  if (!existing) {
    throw new Error(`Run not found: ${runId}`);
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE runs SET config_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(config), now, runId);
  return { ...existing, config, updatedAt: now };
}

export function getRunInput(db: Database.Database, runId: string): RunInputRecord | undefined {
  const row = db
    .prepare('SELECT * FROM run_inputs WHERE run_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(runId) as RunInputRow | undefined;
  return row ? mapRunInput(row) : undefined;
}

export interface AddRunFileParams {
  name: string;
  path: string;
  type: string;
  phase?: Phase | null;
}

export function addRunFile(db: Database.Database, runId: string, file: AddRunFileParams): RunFileRecord {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO run_files (id, run_id, name, path, type, phase, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, runId, file.name, file.path, file.type, file.phase ?? null, now);

  return { id, runId, name: file.name, path: file.path, type: file.type, phase: file.phase ?? null, createdAt: now };
}

export function listRunFiles(db: Database.Database, runId: string, type?: string): RunFileRecord[] {
  const rows = type
    ? (db
        .prepare('SELECT * FROM run_files WHERE run_id = ? AND type = ? ORDER BY created_at ASC, rowid ASC')
        .all(runId, type) as RunFileRow[])
    : (db
        .prepare('SELECT * FROM run_files WHERE run_id = ? ORDER BY created_at ASC, rowid ASC')
        .all(runId) as RunFileRow[]);
  return rows.map(mapRunFile);
}

export interface RecordHitlDecisionParams {
  phase: HitlPhase;
  decision: HitlDecisionValue;
  comments?: string;
}

export function recordHitlDecision(
  db: Database.Database,
  runId: string,
  decision: RecordHitlDecisionParams,
): HitlDecisionRecord {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO hitl_decisions (id, run_id, phase, decision, comments, decided_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, runId, decision.phase, decision.decision, decision.comments ?? null, now);

  return {
    id,
    runId,
    phase: decision.phase,
    decision: decision.decision,
    comments: decision.comments ?? null,
    decidedAt: now,
  };
}

export function listHitlDecisions(db: Database.Database, runId: string): HitlDecisionRecord[] {
  const rows = db
    .prepare('SELECT * FROM hitl_decisions WHERE run_id = ? ORDER BY decided_at ASC, rowid ASC')
    .all(runId) as HitlDecisionRow[];
  return rows.map(mapHitlDecision);
}

export interface RecordJeveResultParams {
  valid: boolean;
  decisions?: JeveDecision[];
  errors?: unknown[];
  normalizedInput?: unknown;
}

export function recordJeveResult(
  db: Database.Database,
  runId: string,
  result: RecordJeveResultParams,
): JeveResultRecord {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO jeve_results (id, run_id, valid, decisions_json, errors_json, normalized_input_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    runId,
    result.valid ? 1 : 0,
    result.decisions ? JSON.stringify(result.decisions) : null,
    result.errors ? JSON.stringify(result.errors) : null,
    result.normalizedInput !== undefined ? JSON.stringify(result.normalizedInput) : null,
    now,
  );

  return {
    id,
    runId,
    valid: result.valid,
    decisions: result.decisions ?? null,
    errors: result.errors ?? null,
    normalizedInput: result.normalizedInput ?? null,
    createdAt: now,
  };
}

/** Aggregates the final `{ total, passed, failed }` execution summary onto the run record. */
export function setRunExecutionSummary(
  db: Database.Database,
  runId: string,
  summary: ExecutionSummary,
): RunRecord {
  const existing = getRun(db, runId);
  if (!existing) {
    throw new Error(`Run not found: ${runId}`);
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE runs SET execution_summary_json = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(summary),
    now,
    runId,
  );
  return { ...existing, executionSummary: summary, updatedAt: now };
}

export function getLatestJeveResult(db: Database.Database, runId: string): JeveResultRecord | undefined {
  const row = db
    .prepare('SELECT * FROM jeve_results WHERE run_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1')
    .get(runId) as JeveResultRow | undefined;
  return row ? mapJeveResult(row) : undefined;
}
