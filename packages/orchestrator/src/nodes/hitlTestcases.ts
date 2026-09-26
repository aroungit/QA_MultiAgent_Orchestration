import { interrupt } from '@langchain/langgraph';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import type { HitlInterruptPayload, HitlResumeValue } from './hitlTypes.js';

/** Pauses the graph for test-case review; resumes with the caller's approve/reject decision. */
export async function hitlTestcases(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const resume = interrupt<HitlInterruptPayload, HitlResumeValue>({
    phase: 'hitl_testcases',
    runId: state.runId,
    artifacts: {
      testCasesJsonPath: state.testCases.testCasesJsonPath,
      summaryMarkdownPath: state.testCases.summaryMarkdownPath,
    },
  });

  return {
    status: resume.decision === 'approved' ? 'running' : 'rejected',
    testCases: { ...state.testCases, hitlStatus: resume.decision, hitlComments: resume.comments },
  };
}
