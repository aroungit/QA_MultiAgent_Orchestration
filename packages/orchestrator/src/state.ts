import { Annotation } from '@langchain/langgraph';
import type {
  AutomationState,
  ExecutionState,
  JeveResultState,
  Phase,
  RequirementsState,
  RunConfig,
  RunState,
  RunStatus,
  TestCasesState,
} from '@qa-agent/shared';

/** LangGraph channel definition mirroring `RunState` from `@qa-agent/shared`; each field replaces on update. */
export const OrchestratorState = Annotation.Root({
  runId: Annotation<string>,
  status: Annotation<RunStatus>,
  currentPhase: Annotation<Phase | null>,
  input: Annotation<RunState['input']>,
  jeve: Annotation<JeveResultState>,
  requirements: Annotation<RequirementsState>,
  testCases: Annotation<TestCasesState>,
  automation: Annotation<AutomationState>,
  execution: Annotation<ExecutionState>,
  config: Annotation<RunConfig>,
});

export type OrchestratorStateType = typeof OrchestratorState.State;
export type OrchestratorStateUpdate = typeof OrchestratorState.Update;

/** Builds the initial graph state for a new run from its persisted config/input. */
export function createInitialRunState(params: {
  runId: string;
  config: RunConfig;
  rawText?: string;
  files?: RunState['input']['files'];
}): OrchestratorStateType {
  return {
    runId: params.runId,
    status: 'created',
    currentPhase: null,
    input: { rawText: params.rawText, files: params.files ?? [] },
    jeve: { valid: false },
    requirements: { revision: 0, regenerationHistory: [] },
    testCases: { revision: 0, regenerationHistory: [] },
    automation: { generatedTestFiles: [], revision: 0, regenerationHistory: [] },
    execution: {},
    config: params.config,
  };
}
