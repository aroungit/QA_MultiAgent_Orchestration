import type { RunDetail } from './service.js';

/** Flattens a `RunDetail` (DB row + live graph state + HITL/file history) into a UI-friendly JSON payload. */
export function toRunResponse(detail: RunDetail) {
  const { run, state, hitlDecisions, files } = detail;
  return {
    runId: run.id,
    status: run.status,
    currentPhase: run.currentPhase,
    config: run.config,
    executionSummary: run.executionSummary,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    input: state?.input,
    jeve: state?.jeve,
    requirements: state?.requirements,
    testCases: state?.testCases,
    automation: state?.automation,
    execution: state?.execution,
    hitlDecisions,
    files,
  };
}
