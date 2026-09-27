import { interrupt } from '@langchain/langgraph';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { recordRegenerationFeedback } from '../regeneration.js';
import type { HitlInterruptPayload, HitlResumeValue } from './hitlTypes.js';

/** Optional pause for automation review; resumes with the caller's approve/reject decision. */
export async function hitlAutomation(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const resume = interrupt<HitlInterruptPayload, HitlResumeValue>({
    phase: 'hitl_automation',
    runId: state.runId,
    artifacts: { generatedTestFiles: state.automation.generatedTestFiles.join(', ') },
  });

  const regenerationHistory =
    resume.decision === 'rejected'
      ? recordRegenerationFeedback(
          state.automation.revision,
          resume.comments,
          state.automation.generatedTestFiles,
          state.automation.regenerationHistory,
        )
      : state.automation.regenerationHistory;

  return {
    status: 'running',
    currentPhase: resume.decision === 'approved' ? 'execute_tests' : 'agent3_automation',
    automation: {
      ...state.automation,
      hitlStatus: resume.decision,
      hitlComments: resume.comments,
      regenerationHistory,
    },
  };
}
