import { END, START, StateGraph } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { OrchestratorState } from './state.js';
import { ingestInput } from './nodes/ingestInput.js';
import { jeveValidate } from './nodes/jeveValidate.js';
import { agent1Requirements } from './nodes/agent1Requirements.js';
import { hitlRequirements } from './nodes/hitlRequirements.js';
import { agent2Testcases } from './nodes/agent2Testcases.js';
import { hitlTestcases } from './nodes/hitlTestcases.js';
import { agent3Automation } from './nodes/agent3Automation.js';
import { hitlAutomation } from './nodes/hitlAutomation.js';
import { executeTests } from './nodes/executeTests.js';
import { finalizeRun } from './nodes/finalizeRun.js';

/**
 * Builds the `RunState` graph per architecture §5: all agent/HITL nodes are stubs at this phase,
 * wired with the real conditional edges (JEV validity, HITL approve/reject, automation gate).
 */
export function buildOrchestratorGraph() {
  return new StateGraph(OrchestratorState)
    .addNode('ingest_input', ingestInput)
    .addNode('jeve_validate', jeveValidate)
    .addNode('agent1_requirements', agent1Requirements)
    .addNode('hitl_requirements', hitlRequirements)
    .addNode('agent2_testcases', agent2Testcases)
    .addNode('hitl_testcases', hitlTestcases)
    .addNode('agent3_automation', agent3Automation)
    .addNode('hitl_automation', hitlAutomation)
    .addNode('execute_tests', executeTests)
    .addNode('finalize_run', finalizeRun)
    .addEdge(START, 'ingest_input')
    .addEdge('ingest_input', 'jeve_validate')
    .addConditionalEdges('jeve_validate', (state) => (state.jeve.valid ? 'agent1_requirements' : END), [
      'agent1_requirements',
      END,
    ])
    .addEdge('agent1_requirements', 'hitl_requirements')
    .addConditionalEdges(
      'hitl_requirements',
      (state) => (state.requirements.hitlStatus === 'approved' ? 'agent2_testcases' : 'agent1_requirements'),
      ['agent2_testcases', 'agent1_requirements'],
    )
    .addEdge('agent2_testcases', 'hitl_testcases')
    .addConditionalEdges(
      'hitl_testcases',
      (state) => (state.testCases.hitlStatus === 'approved' ? 'agent3_automation' : 'agent2_testcases'),
      ['agent3_automation', 'agent2_testcases'],
    )
    .addConditionalEdges(
      'agent3_automation',
      (state) => (state.config.enableHITLAutomation ? 'hitl_automation' : 'execute_tests'),
      ['hitl_automation', 'execute_tests'],
    )
    .addConditionalEdges(
      'hitl_automation',
      (state) => (state.automation.hitlStatus === 'approved' ? 'execute_tests' : 'agent3_automation'),
      ['execute_tests', 'agent3_automation'],
    )
    .addEdge('execute_tests', 'finalize_run')
    .addEdge('finalize_run', END);
}

/** Compiles the orchestrator graph with the given checkpointer (defaults to in-memory). */
export function compileOrchestratorGraph(checkpointer?: BaseCheckpointSaver) {
  return buildOrchestratorGraph().compile({ checkpointer });
}
