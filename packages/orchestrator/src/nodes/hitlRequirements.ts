import { interrupt } from '@langchain/langgraph';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
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

  return {
    status: resume.decision === 'approved' ? 'running' : 'rejected',
    requirements: { ...state.requirements, hitlStatus: resume.decision, hitlComments: resume.comments },
  };
}
