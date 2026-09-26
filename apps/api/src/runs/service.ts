import path from 'node:path';
import fs from 'node:fs';
import type Database from 'better-sqlite3';
import {
  runConfigSchema,
  requirementsDocumentSchema,
  testCasesDocumentSchema,
  type ExecutionSummary,
  type HitlPhase,
  type RunConfig,
  type RunFileRef,
  type RunState,
} from '@qa-agent/shared';
import { Command, createInitialRunState, type OrchestratorStateType } from '@qa-agent/orchestrator';
import { ProviderRateLimitError } from '@qa-agent/providers';
import * as repo from '../db/repository.js';
import type { HitlDecisionRecord, RunFileRecord, RunRecord } from '../db/types.js';
import { runWorkspacePath } from '../workspace/fs.js';
import { getOrchestratorGraph, getOrchestratorState, threadConfig } from '../orchestrator/runtime.js';
import { buildRequirementsWorkbook, buildTestCasesWorkbook } from './excel.js';

export class RunConflictError extends Error {}
export class RunNotFoundError extends Error {}
export class RunRateLimitError extends Error {
  constructor(readonly retryAfterSeconds?: number) {
    super('The configured LLM provider is rate-limited. Please retry after the quota resets.');
  }
}

export interface UploadedFile {
  name: string;
  buffer: Buffer;
}

export interface CreateRunParams {
  rawText?: string;
  config?: Partial<RunConfig>;
  files?: UploadedFile[];
}

export interface RunDetail {
  run: RunRecord;
  state?: OrchestratorStateType;
  hitlDecisions: HitlDecisionRecord[];
  files: RunFileRecord[];
}

function resolveRunConfig(partial?: Partial<RunConfig>): RunConfig {
  return runConfigSchema.parse({
    llmProvider: partial?.llmProvider ?? process.env.DEFAULT_LLM_PROVIDER ?? 'groq',
    llmModel: partial?.llmModel ?? process.env.DEFAULT_LLM_MODEL ?? 'llama-3.1-70b-versatile',
    embeddingsProvider: partial?.embeddingsProvider ?? process.env.DEFAULT_EMBEDDINGS_PROVIDER ?? 'voyage',
    embeddingsModel: partial?.embeddingsModel ?? process.env.DEFAULT_EMBEDDINGS_MODEL ?? 'voyage-3',
    enableHITLAutomation: partial?.enableHITLAutomation ?? process.env.ENABLE_HITL_AUTOMATION === 'true',
  });
}

/** Persists any new artifact paths surfaced by the graph state into `run_files` (dedup by path). */
function registerArtifactFiles(db: Database.Database, runId: string, state: OrchestratorStateType): void {
  const existingPaths = new Set(repo.listRunFiles(db, runId).map((f) => f.path));

  const candidates: { path?: string; name: string; type: string; phase: RunState['currentPhase'] }[] = [
    { path: state.requirements.requirementsJsonPath, name: 'requirements.json', type: 'requirements_json', phase: 'agent1_requirements' },
    { path: state.requirements.summaryMarkdownPath, name: 'summary.md', type: 'requirements_summary', phase: 'agent1_requirements' },
    { path: state.testCases.testCasesJsonPath, name: 'testcases.json', type: 'testcases_json', phase: 'agent2_testcases' },
    { path: state.testCases.summaryMarkdownPath, name: 'testcases_summary.md', type: 'testcases_summary', phase: 'agent2_testcases' },
    { path: state.execution.reportHtmlPath, name: 'report.html', type: 'report_html', phase: 'execute_tests' },
    { path: state.execution.reportJsonPath, name: 'report.json', type: 'report_json', phase: 'execute_tests' },
    { path: state.execution.reportJunitPath, name: 'report.junit.xml', type: 'report_junit', phase: 'execute_tests' },
    { path: state.execution.reportAllurePath, name: 'allure', type: 'report_allure', phase: 'execute_tests' },
    ...state.automation.generatedTestFiles.map((filePath) => ({
      path: filePath,
      name: path.basename(filePath),
      type: 'test_file',
      phase: 'agent3_automation' as const,
    })),
  ];

  for (const candidate of candidates) {
    if (!candidate.path || existingPaths.has(candidate.path)) continue;
    repo.addRunFile(db, runId, { name: candidate.name, path: candidate.path, type: candidate.type, phase: candidate.phase });
    existingPaths.add(candidate.path);
  }
}

/** Mirrors the graph's latest state onto the DB (lifecycle metadata, JEV result, execution summary, files). */
async function syncStateToDb(db: Database.Database, runId: string, state: OrchestratorStateType): Promise<void> {
  repo.updateRunStatus(db, runId, { status: state.status, currentPhase: state.currentPhase });

  if (state.jeve.decisions && !repo.getLatestJeveResult(db, runId)) {
    repo.recordJeveResult(db, runId, {
      valid: state.jeve.valid,
      decisions: state.jeve.decisions,
      errors: state.jeve.errors as unknown[] | undefined,
      normalizedInput: state.jeve.normalizedInput,
    });
  }

  registerArtifactFiles(db, runId, state);

  if (state.execution.summary) {
    repo.setRunExecutionSummary(db, runId, state.execution.summary);
  }
}

export async function createRun(db: Database.Database, params: CreateRunParams): Promise<RunDetail> {
  const config = resolveRunConfig(params.config);
  const run = repo.createRun(db, { config, rawText: params.rawText });

  const fileRefs: RunFileRef[] = [];
  for (const file of params.files ?? []) {
    const dest = path.join(runWorkspacePath(run.id), 'inputs', file.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.buffer);
    const relPath = path.join('workspace', run.id, 'inputs', file.name).split(path.sep).join('/');
    repo.addRunFile(db, run.id, { name: file.name, path: relPath, type: 'input', phase: null });
    fileRefs.push({ name: file.name, path: relPath, type: 'input' });
  }

  const initialState = createInitialRunState({ runId: run.id, config, rawText: params.rawText, files: fileRefs });
  const graph = getOrchestratorGraph();
  try {
    const result = (await graph.invoke(initialState, threadConfig(run.id))) as OrchestratorStateType;
    await syncStateToDb(db, run.id, result);
  } catch (err) {
    repo.updateRunStatus(db, run.id, { status: 'failed' });
    throw err;
  }

  return getRunDetail(db, run.id) as Promise<RunDetail>;
}

export function listRuns(db: Database.Database): RunRecord[] {
  return repo.listRuns(db);
}

export async function getRunDetail(db: Database.Database, runId: string): Promise<RunDetail | undefined> {
  const run = repo.getRun(db, runId);
  if (!run) return undefined;

  let state: OrchestratorStateType | undefined;
  try {
    state = await getOrchestratorState(runId);
  } catch {
    state = undefined;
  }

  return {
    run,
    state,
    hitlDecisions: repo.listHitlDecisions(db, runId),
    files: repo.listRunFiles(db, runId),
  };
}

export async function resumeRun(
  db: Database.Database,
  runId: string,
  phase: HitlPhase,
  decision: 'approved' | 'rejected',
  comments?: string,
): Promise<RunDetail> {
  const run = repo.getRun(db, runId);
  if (!run) throw new RunNotFoundError(`Run not found: ${runId}`);
  if (run.status !== 'waiting_hitl' || run.currentPhase !== phase) {
    throw new RunConflictError(`Run ${runId} is not waiting at ${phase} (status=${run.status}, phase=${run.currentPhase})`);
  }

  const graph = getOrchestratorGraph();
  try {
    const result = (await graph.invoke(
      new Command({ resume: { decision, comments } }),
      threadConfig(runId),
    )) as OrchestratorStateType;
    repo.recordHitlDecision(db, runId, { phase, decision, comments });
    await syncStateToDb(db, runId, result);
  } catch (err) {
    // The graph is still paused at the same interrupt (invoke threw before advancing past it), so
    // keep the run at 'waiting_hitl'/`phase` instead of 'failed' — otherwise a transient error (e.g. a
    // flaky LLM call) permanently strands the run, since a 'failed' run can never satisfy the
    // waiting_hitl/phase guard above and the recorded decision could never be resubmitted.
    repo.updateRunStatus(db, runId, { status: 'waiting_hitl', currentPhase: phase });
    if (err instanceof ProviderRateLimitError) throw new RunRateLimitError(err.retryAfterSeconds);
    throw err;
  }

  return getRunDetail(db, runId) as Promise<RunDetail>;
}

export interface ArtifactPayload {
  contentType: string;
  filename?: string;
  content: Buffer;
}

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.xml': 'application/xml',
  '.ts': 'text/plain',
};

/** `run_files.type` -> the workspace subdir it lives under (per the `writeRunArtifact` convention). */
const TYPE_SUBDIR: Record<string, string> = {
  input: 'inputs',
  requirements_json: 'requirements',
  requirements_summary: 'requirements',
  testcases_json: 'testcases',
  testcases_summary: 'testcases',
  test_file: 'tests',
  report_html: 'execution',
  report_json: 'execution',
  report_junit: 'execution',
  report_allure: 'execution',
};

/** Resolves the real absolute path for a `run_files` row via the `runId/subdir/name` convention
 *  (never by parsing the stored `path` string, which is a display path that ignores `WORKSPACE_ROOT`). */
function resolveArtifactAbsPath(runId: string, file: RunFileRecord): string {
  const subdir = TYPE_SUBDIR[file.type] ?? file.type;
  return path.join(runWorkspacePath(runId), subdir, file.name);
}

/** Resolves a run artifact by `run_files.type`, plus on-the-fly Excel exports for requirements/testcases.
 *  `fileName` disambiguates types with multiple rows (e.g. `test_file`) — defaults to the most recent. */
export async function getArtifact(
  db: Database.Database,
  runId: string,
  type: string,
  fileName?: string,
): Promise<ArtifactPayload | undefined> {
  const run = repo.getRun(db, runId);
  if (!run) return undefined;

  if (type === 'requirements_excel' || type === 'testcases_excel') {
    const sourceType = type === 'requirements_excel' ? 'requirements_json' : 'testcases_json';
    const file = repo.listRunFiles(db, runId, sourceType).at(-1);
    if (!file) return undefined;
    const json = JSON.parse(fs.readFileSync(resolveArtifactAbsPath(runId, file), 'utf-8'));
    if (type === 'requirements_excel') {
      const doc = requirementsDocumentSchema.parse(json);
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'requirements.xlsx',
        content: await buildRequirementsWorkbook(doc),
      };
    }
    const doc = testCasesDocumentSchema.parse(json);
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'testcases.xlsx',
      content: await buildTestCasesWorkbook(doc),
    };
  }

  const matches = repo.listRunFiles(db, runId, type);
  const file = fileName ? matches.find((f) => f.name === fileName) : matches.at(-1);
  if (!file) return undefined;

  let absPath = resolveArtifactAbsPath(runId, file);
  if (fs.statSync(absPath).isDirectory()) {
    absPath = path.join(absPath, 'index.html');
  }

  const ext = path.extname(absPath).toLowerCase();
  return {
    contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    filename: path.basename(absPath),
    content: fs.readFileSync(absPath),
  };
}

export async function getExecutionSummary(db: Database.Database, runId: string): Promise<ExecutionSummary | undefined> {
  const run = repo.getRun(db, runId);
  if (!run) return undefined;
  if (run.executionSummary) return run.executionSummary;
  const state = await getOrchestratorState(runId);
  return state?.execution.summary;
}

export interface TrendPoint {
  runId: string;
  createdAt: string;
  summary: ExecutionSummary;
}

export function getTrends(db: Database.Database): TrendPoint[] {
  return repo
    .listRuns(db)
    .filter((run) => run.executionSummary)
    .map((run) => ({ runId: run.id, createdAt: run.createdAt, summary: run.executionSummary as ExecutionSummary }))
    .reverse();
}
