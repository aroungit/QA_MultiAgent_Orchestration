import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';

/** Aggregates final run status from the execution summary. */
export async function finalizeRun(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const failed = (state.execution.summary?.failed ?? 0) + (state.execution.summary?.infrastructureFailures ?? 0);
  return {
    status: failed > 0 ? 'failed' : 'completed',
    currentPhase: 'finalize_run',
  };
}
