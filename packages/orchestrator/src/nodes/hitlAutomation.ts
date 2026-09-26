import { interrupt } from '@langchain/langgraph';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import type { HitlInterruptPayload, HitlResumeValue } from './hitlTypes.js';

/** Optional pause for automation review; resumes with the caller's approve/reject decision. */
export async function hitlAutomation(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const resume = interrupt<HitlInterruptPayload, HitlResumeValue>({
    phase: 'hitl_automation',
    runId: state.runId,
    artifacts: { generatedTestFiles: state.automation.generatedTestFiles.join(', ') },
  });

  return {
    status: resume.decision === 'approved' ? 'running' : 'rejected',
    currentPhase: 'execute_tests',
    automation: { ...state.automation, hitlStatus: resume.decision, hitlComments: resume.comments },
  };
}
