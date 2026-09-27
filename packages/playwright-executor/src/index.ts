import fs from 'node:fs';
import path from 'node:path';
import { execFile, type ExecFileOptions } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExecutionBackend, ExecutionSummary } from '@qa-agent/shared';

const execFileAsync = promisify(execFile);
const DEFAULT_DOCKER_IMAGE = 'mcr.microsoft.com/playwright:v1.46.1-jammy';
const DEFAULT_DOCKER_SHM_SIZE = '1g';

export interface RunPlaywrightTestsParams {
  runId: string;
  /** Absolute directory containing the generated `*.spec.ts` files. */
  testDir: string;
  /** Absolute paths for the approved spec files to execute. When provided, only these files are staged and run. */
  testFilePaths?: string[];
  /** Absolute directory to write reports/artifacts into (`workspace/<runId>/execution`). */
  outputDir: string;
  /** Working directory `npx playwright` is spawned from (repo root, so it resolves the installed binary). */
  cwd: string;
  /** Base URL injected into generated tests' navigation, if the app under test needs one. */
  baseUrl?: string;
  /** Execution runtime for the Playwright CLI. */
  executionBackend?: ExecutionBackend;
  /** Optional override for the Playwright Docker image when `executionBackend` is `docker`. */
  dockerImage?: string;
}

export interface RunPlaywrightTestsResult {
  reportHtmlPath: string;
  reportJsonPath: string;
  reportJunitPath: string;
  reportAllurePath?: string;
  summary: ExecutionSummary;
  infrastructureErrors: string[];
}

interface PlaywrightJsonError {
  message?: string;
  stack?: string;
}

interface PlaywrightJsonTestResult {
  status: string;
  workerIndex?: number;
  parallelIndex?: number;
  error?: PlaywrightJsonError;
  errors?: PlaywrightJsonError[];
}

interface PlaywrightJsonSuite {
  suites?: PlaywrightJsonSuite[];
  specs?: { tests?: { results?: PlaywrightJsonTestResult[] }[] }[];
}

interface PlaywrightJsonReport {
  suites?: PlaywrightJsonSuite[];
}

const INFRASTRUCTURE_ERROR_PATTERNS = [
  /Cannot find module .*config\.generated/i,
  /workerProcessEntry/i,
  /Failed to launch/i,
  /browserType\.launch/i,
  /Executable doesn't exist/i,
  /ENOENT/i,
  /EACCES/i,
  /ERR_MODULE_NOT_FOUND/i,
];

export function stageApprovedTests(testDir: string, outputDir: string, approvedTestFiles: string[] | undefined): string {
  if (!approvedTestFiles || approvedTestFiles.length === 0) {
    return testDir;
  }

  const stagedDir = path.join(outputDir, 'approved-tests');
  fs.rmSync(stagedDir, { recursive: true, force: true });
  fs.mkdirSync(stagedDir, { recursive: true });

  for (const sourcePath of approvedTestFiles) {
    fs.copyFileSync(sourcePath, path.join(stagedDir, path.basename(sourcePath)));
  }

  return stagedDir;
}

export interface PlaywrightExecutionPlan {
  backend: ExecutionBackend;
  command: string;
  args: string[];
  execOptions: ExecFileOptions;
  configPath: string;
  configTestDir: string;
  configOutputDir: string;
}

function writePlaywrightConfig(
  testDir: string,
  outputDir: string,
  baseUrl: string | undefined,
  configPath: string,
): void {
  const allureResultsDir = path.join(outputDir, 'allure-results');
  const config = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: ${JSON.stringify(testDir)},
  outputDir: ${JSON.stringify(path.join(outputDir, 'artifacts'))},
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: ${JSON.stringify(path.join(outputDir, 'html'))}, open: 'never' }],
    ['json', { outputFile: ${JSON.stringify(path.join(outputDir, 'report.json'))} }],
    ['junit', { outputFile: ${JSON.stringify(path.join(outputDir, 'report.junit.xml'))} }],
    ['allure-playwright', { outputFolder: ${JSON.stringify(allureResultsDir)} }],
  ],
  use: {
    baseURL: ${JSON.stringify(baseUrl ?? undefined)},
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
function collectResultMessages(result: PlaywrightJsonTestResult): string[] {
  const messages = [];
  if (result.error?.message) messages.push(result.error.message);
  for (const error of result.errors ?? []) {
    if (error.message) messages.push(error.message);
  }
  return messages;
}

function isInfrastructureFailure(result: PlaywrightJsonTestResult): boolean {
  if (result.workerIndex === -1 && result.parallelIndex === -1) {
    return true;
  }

  const messages = collectResultMessages(result).join('\n');
  return INFRASTRUCTURE_ERROR_PATTERNS.some((pattern) => pattern.test(messages));
}

export function summarizePlaywrightReport(report: PlaywrightJsonReport): {
  summary: ExecutionSummary;
  infrastructureErrors: string[];
} {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let infrastructureFailures = 0;
  const infrastructureErrors = new Set<string>();

  function walk(suite: PlaywrightJsonSuite | undefined) {
    if (!suite) return;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          total += 1;
          if (result.status === 'passed') passed += 1;
          else if (result.status === 'skipped') skipped += 1;
          else if (isInfrastructureFailure(result)) {
            infrastructureFailures += 1;
            for (const message of collectResultMessages(result)) {
              infrastructureErrors.add(message.split('\n')[0] ?? message);
            }
          } else {
            failed += 1;
          }
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  }

  for (const suite of report.suites ?? []) walk(suite);

  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      infrastructureFailures,
      failureMode:
        infrastructureFailures > 0
          ? failed > 0
            ? 'mixed'
            : 'infrastructure'
          : failed > 0
            ? 'assertion'
            : 'passed',
    },
    infrastructureErrors: [...infrastructureErrors],
  };
}

function toContainerPath(...segments: string[]): string {
  return path.posix.join(...segments);
}

export function buildPlaywrightExecutionPlan(params: RunPlaywrightTestsParams): PlaywrightExecutionPlan {
  const backend = params.executionBackend ?? 'local';

  if (backend === 'docker') {
    const repoMount = '/work';
    const testsMount = '/generated-tests';
    const outputMount = '/generated-output';
    const configPath = path.join(params.cwd, '.playwright-configs', `${params.runId}.docker.config.generated.ts`);
    const configPathInContainer = toContainerPath(repoMount, '.playwright-configs', path.basename(configPath));
    const dockerImage = params.dockerImage ?? process.env.PLAYWRIGHT_DOCKER_IMAGE ?? DEFAULT_DOCKER_IMAGE;
    const shmSize = process.env.PLAYWRIGHT_DOCKER_SHM_SIZE ?? DEFAULT_DOCKER_SHM_SIZE;

    return {
      backend,
      command: 'docker',
      args: [
        'run',
        '--rm',
        '--shm-size',
        shmSize,
        '-e',
        `NODE_PATH=${toContainerPath(repoMount, 'node_modules')}`,
        '-v',
        `${params.cwd}:${repoMount}`,
        '-v',
        `${params.testDir}:${testsMount}`,
        '-v',
        `${params.outputDir}:${outputMount}`,
        '-w',
        repoMount,
        dockerImage,
        'npx',
        'playwright',
        'test',
        '--config',
        configPathInContainer,
      ],
      execOptions: { shell: false },
      configPath,
      configTestDir: testsMount,
      configOutputDir: outputMount,
    };
  }

  return {
    backend,
    command: 'npx',
    args: ['playwright', 'test', '--config', path.join(params.cwd, '.playwright-configs', `${params.runId}.config.generated.ts`)],
    execOptions: {
      cwd: params.cwd,
      shell: true,
      env: { ...process.env, NODE_PATH: path.join(params.cwd, 'node_modules') },
    },
    configPath: path.join(params.cwd, '.playwright-configs', `${params.runId}.config.generated.ts`),
    configTestDir: params.testDir,
    configOutputDir: params.outputDir,
  };
}

/**
 * Runs generated Playwright specs via the CLI (`npx playwright test`), collecting HTML/JSON/JUnit/Allure
 * reports plus screenshots/videos/traces on failure, all under `outputDir`. Non-zero Playwright exit codes
 * (i.e. failing tests) are expected outcomes, not thrown errors — only a spawn/config failure throws.
 */
export async function runPlaywrightTests(params: RunPlaywrightTestsParams): Promise<RunPlaywrightTestsResult> {
  fs.mkdirSync(params.outputDir, { recursive: true });
  const executionTestDir = stageApprovedTests(params.testDir, params.outputDir, params.testFilePaths);
  const plan = buildPlaywrightExecutionPlan(params);
  // The generated config stays under `cwd` even for Docker runs so the mounted repo's own
  // `node_modules` remain the single dependency source for the config import.
  const configDir = path.dirname(plan.configPath);
  fs.mkdirSync(configDir, { recursive: true });
  writePlaywrightConfig(
    executionTestDir === params.testDir ? plan.configTestDir : executionTestDir,
    plan.configOutputDir,
    params.baseUrl,
    plan.configPath,
  );

  try {
    await execFileAsync(plan.command, plan.args, plan.execOptions);
  } catch (err) {
    // playwright test exits non-zero when tests fail; that's fine as long as the JSON report was produced.
    const reportPath = path.join(params.outputDir, 'report.json');
    if (!fs.existsSync(reportPath)) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  const reportJsonPath = path.join(params.outputDir, 'report.json');
  const report = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8')) as PlaywrightJsonReport;
  const { summary, infrastructureErrors } = summarizePlaywrightReport(report);

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
    infrastructureErrors,
  };
}
