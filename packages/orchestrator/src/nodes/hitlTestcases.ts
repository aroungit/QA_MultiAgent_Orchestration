import { interrupt } from '@langchain/langgraph';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { recordRegenerationFeedback } from '../regeneration.js';
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

  const regenerationHistory =
    resume.decision === 'rejected'
      ? recordRegenerationFeedback(
          state.testCases.revision,
          resume.comments,
          [state.testCases.testCasesJsonPath, state.testCases.summaryMarkdownPath],
          state.testCases.regenerationHistory,
        )
      : state.testCases.regenerationHistory;

  return {
    status: 'running',
    testCases: {
      ...state.testCases,
      hitlStatus: resume.decision,
      hitlComments: resume.comments,
      regenerationHistory,
    },
  };
}
