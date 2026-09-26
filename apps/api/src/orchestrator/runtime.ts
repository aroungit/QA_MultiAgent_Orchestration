import fs from 'node:fs';
import path from 'node:path';
import { compileOrchestratorGraph, createSqliteCheckpointer, type OrchestratorStateType } from '@qa-agent/orchestrator';
import { REPO_ROOT } from '../paths.js';

type CompiledGraph = ReturnType<typeof compileOrchestratorGraph>;

let compiledGraph: CompiledGraph | undefined;

function resolveCheckpointDbPath(): string {
  const configured = process.env.CHECKPOINT_DATABASE_PATH ?? './data/langgraph-checkpoints.sqlite';
  return path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT, configured);
}

/** Lazily-compiled, process-wide orchestrator graph backed by a SQLite checkpointer (pause/resume across requests). */
export function getOrchestratorGraph(): CompiledGraph {
  if (!compiledGraph) {
    const dbPath = resolveCheckpointDbPath();
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    compiledGraph = compileOrchestratorGraph(createSqliteCheckpointer(dbPath));
  }
  return compiledGraph;
}

export function threadConfig(runId: string) {
  return { configurable: { thread_id: runId } };
}

/** Fetches the live `OrchestratorStateType` for a run from the checkpointer, without invoking any node. */
export async function getOrchestratorState(runId: string): Promise<OrchestratorStateType | undefined> {
  const snapshot = await getOrchestratorGraph().getState(threadConfig(runId));
  return snapshot.values as OrchestratorStateType | undefined;
}
