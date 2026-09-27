import { interrupt } from '@langchain/langgraph';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { recordRegenerationFeedback } from '../regeneration.js';
import type { HitlInterruptPayload, HitlResumeValue } from './hitlTypes.js';

/** Pauses the graph for requirements review; resumes with the caller's approve/reject decision. */
export async function hitlRequirements(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const resume = interrupt<HitlInterruptPayload, HitlResumeValue>({
    phase: 'hitl_requirements',
    runId: state.runId,
    artifacts: {
      requirementsJsonPath: state.requirements.requirementsJsonPath,
      summaryMarkdownPath: state.requirements.summaryMarkdownPath,
    },
  });

  const regenerationHistory =
    resume.decision === 'rejected'
      ? recordRegenerationFeedback(
          state.requirements.revision,
          resume.comments,
          [state.requirements.requirementsJsonPath, state.requirements.summaryMarkdownPath],
          state.requirements.regenerationHistory,
        )
      : state.requirements.regenerationHistory;

  return {
    status: 'running',
    requirements: {
      ...state.requirements,
      hitlStatus: resume.decision,
      hitlComments: resume.comments,
      regenerationHistory,
    },
  };
}
