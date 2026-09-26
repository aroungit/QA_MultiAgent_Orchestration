import { evaluateInput } from '@qa-agent/jev';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';

/** Pre-LLM calibrated gating via `@qa-agent/jev`; branches the graph to `failed` on rejection. */
export async function jeveValidate(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const result = await evaluateInput({
    rawText: state.input.rawText,
    files: state.input.files.map((f) => ({ name: f.name })),
  });

  if (!result.valid) {
    return {
      status: 'failed',
      currentPhase: 'jeve_validate',
      jeve: { valid: false, decisions: result.decisions, errors: result.errors },
    };
  }

  return {
    status: 'running',
    currentPhase: 'jeve_validate',
    jeve: { valid: true, decisions: result.decisions, normalizedInput: result.normalizedInput },
  };
}
