import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';

/** Stub: marks the run as ingested and running; real logic (persisting inputs) lives in the API layer. */
export async function ingestInput(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  return {
    status: 'running',
    currentPhase: 'ingest_input',
  };
}
