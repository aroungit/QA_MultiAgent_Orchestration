import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExecutionSummary } from '@qa-agent/shared';

const execFileAsync = promisify(execFile);

export interface RunPlaywrightTestsParams {
  runId: string;
  /** Absolute directory containing the generated `*.spec.ts` files. */
  testDir: string;
  /** Absolute directory to write reports/artifacts into (`workspace/<runId>/execution`). */
  outputDir: string;
  /** Working directory `npx playwright` is spawned from (repo root, so it resolves the installed binary). */
  cwd: string;
  /** Base URL injected into generated tests' navigation, if the app under test needs one. */
  baseUrl?: string;
}

export interface RunPlaywrightTestsResult {
  reportHtmlPath: string;
  reportJsonPath: string;
  reportJunitPath: string;
  reportAllurePath?: string;
  summary: ExecutionSummary;
}

interface PlaywrightJsonSuite {
  suites?: PlaywrightJsonSuite[];
  specs?: { tests?: { results?: { status: string }[] }[] }[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightJsonSuite[];
}

function countResults(report: PlaywrightJsonReport): ExecutionSummary {
  let total = 0;
  let passed = 0;
  let failed = 0;

  function walk(suite: PlaywrightJsonSuite | undefined) {
    if (!suite) return;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          total += 1;
          if (result.status === 'passed') passed += 1;
          else failed += 1;
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  }

  for (const suite of report.suites ?? []) walk(suite);
  return { total, passed, failed };
}

function writePlaywrightConfig(params: RunPlaywrightTestsParams, configPath: string): void {
  const allureResultsDir = path.join(params.outputDir, 'allure-results');
  const config = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: ${JSON.stringify(params.testDir)},
  outputDir: ${JSON.stringify(path.join(params.outputDir, 'artifacts'))},
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: ${JSON.stringify(path.join(params.outputDir, 'html'))}, open: 'never' }],
    ['json', { outputFile: ${JSON.stringify(path.join(params.outputDir, 'report.json'))} }],
    ['junit', { outputFile: ${JSON.stringify(path.join(params.outputDir, 'report.junit.xml'))} }],
    ['allure-playwright', { outputFolder: ${JSON.stringify(allureResultsDir)} }],
  ],
  use: {
    baseURL: ${JSON.stringify(params.baseUrl ?? undefined)},
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
`;
  fs.writeFileSync(configPath, config, 'utf-8');
}

/** Best-effort Allure HTML generation from raw results; failures here don't fail the overall run. */
async function generateAllureReport(allureResultsDir: string, allureReportDir: string): Promise<boolean> {
  if (!fs.existsSync(allureResultsDir)) return false;
  try {
    await execFileAsync('npx', ['allure', 'generate', allureResultsDir, '-o', allureReportDir, '--clean'], {
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs generated Playwright specs via the CLI (`npx playwright test`), collecting HTML/JSON/JUnit/Allure
 * reports plus screenshots/videos/traces on failure, all under `outputDir`. Non-zero Playwright exit codes
 * (i.e. failing tests) are expected outcomes, not thrown errors — only a spawn/config failure throws.
 */
export async function runPlaywrightTests(params: RunPlaywrightTestsParams): Promise<RunPlaywrightTestsResult> {
  fs.mkdirSync(params.outputDir, { recursive: true });
  // The generated config is written under `cwd` (repo root), not `outputDir`, so Playwright's own
  // module resolution (relative to the config file) can find the `@playwright/test` install even
  // when `outputDir`/`testDir` live outside the repo tree (e.g. a custom `WORKSPACE_ROOT`).
  const configDir = path.join(params.cwd, '.playwright-configs');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, `${params.runId}.config.generated.ts`);
  writePlaywrightConfig(params, configPath);

  try {
    await execFileAsync('npx', ['playwright', 'test', '--config', configPath], {
      cwd: params.cwd,
      shell: true,
      // Lets generated spec files (which may live outside the repo tree, e.g. a custom
      // WORKSPACE_ROOT) resolve `@playwright/test` via the repo's own node_modules.
      env: { ...process.env, NODE_PATH: path.join(params.cwd, 'node_modules') },
    });
  } catch (err) {
    // playwright test exits non-zero when tests fail; that's fine as long as the JSON report was produced.
    const reportPath = path.join(params.outputDir, 'report.json');
    if (!fs.existsSync(reportPath)) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  } finally {
    fs.rmSync(configPath, { force: true });
  }

  const reportJsonPath = path.join(params.outputDir, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8')) as PlaywrightJsonReport;
  const summary = countResults(report);

  const allureResultsDir = path.join(params.outputDir, 'allure-results');
  const allureReportDir = path.join(params.outputDir, 'allure');
  const allureGenerated = await generateAllureReport(allureResultsDir, allureReportDir);

  const toWorkspaceRelative = (absPath: string) =>
    path
      .join('workspace', params.runId, 'execution', path.relative(params.outputDir, absPath))
      .split(path.sep)
      .join('/');

  return {
    reportHtmlPath: toWorkspaceRelative(path.join(params.outputDir, 'html', 'index.html')),
    reportJsonPath: toWorkspaceRelative(reportJsonPath),
    reportJunitPath: toWorkspaceRelative(path.join(params.outputDir, 'report.junit.xml')),
    reportAllurePath: allureGenerated ? toWorkspaceRelative(allureReportDir) : undefined,
    summary,
  };
}
