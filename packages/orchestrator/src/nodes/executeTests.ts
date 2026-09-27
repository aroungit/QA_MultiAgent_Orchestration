import { runPlaywrightTests } from '@qa-agent/playwright-executor';
import { REPO_ROOT } from '../paths.js';
import { resolveDisplayArtifactPath, resolveRunDir } from '../workspace.js';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';

/** Runs the generated Playwright specs via the CLI and collects report/summary artifacts. */
export async function executeTests(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  if (state.automation.generatedTestFiles.length === 0) {
    throw new Error('executeTests: no approved automation files available to execute');
  }

  const testDir = resolveRunDir(state.runId, 'tests');
  const outputDir = resolveRunDir(state.runId, 'execution');

  const result = await runPlaywrightTests({
    runId: state.runId,
    testDir,
    testFilePaths: state.automation.generatedTestFiles.map((displayPath) => resolveDisplayArtifactPath(displayPath)),
    outputDir,
    cwd: REPO_ROOT,
    baseUrl: process.env.TEST_BASE_URL,
    executionBackend: state.config.executionBackend,
  });

  return {
    status: 'running',
    currentPhase: 'finalize_run',
    execution: {
      reportHtmlPath: result.reportHtmlPath,
      reportJsonPath: result.reportJsonPath,
      reportJunitPath: result.reportJunitPath,
      reportAllurePath: result.reportAllurePath,
      summary: result.summary,
      infrastructureErrors: result.infrastructureErrors,
    },
  };
}
