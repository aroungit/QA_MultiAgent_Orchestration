import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPlaywrightExecutionPlan } from '../index.js';

const baseParams = {
  runId: 'run-123',
  testDir: 'D:\\runs\\run-123\\tests',
  outputDir: 'D:\\runs\\run-123\\execution',
  cwd: 'D:\\repo',
  baseUrl: 'http://localhost:3000',
} as const;

describe('buildPlaywrightExecutionPlan', () => {
  it('builds the existing local execution command by default', () => {
    const plan = buildPlaywrightExecutionPlan(baseParams);

    expect(plan.backend).toBe('local');
    expect(plan.command).toBe('npx');
    expect(plan.args).toEqual([
      'playwright',
      'test',
      '--config',
      path.join(baseParams.cwd, '.playwright-configs', 'run-123.config.generated.ts'),
    ]);
    expect(plan.execOptions).toMatchObject({
      cwd: baseParams.cwd,
      shell: true,
      env: expect.objectContaining({
        NODE_PATH: path.join(baseParams.cwd, 'node_modules'),
      }),
    });
    expect(plan.configTestDir).toBe(baseParams.testDir);
    expect(plan.configOutputDir).toBe(baseParams.outputDir);
  });

  it('builds a docker execution command with mounted repo, tests, and output directories', () => {
    const plan = buildPlaywrightExecutionPlan({
      ...baseParams,
      executionBackend: 'docker',
      dockerImage: 'mcr.microsoft.com/playwright:v1.46.1-jammy',
    });

    expect(plan.backend).toBe('docker');
    expect(plan.command).toBe('docker');
    expect(plan.execOptions).toEqual({ shell: false });
    expect(plan.args).toEqual([
      'run',
      '--rm',
      '--shm-size',
      '1g',
      '-e',
      'NODE_PATH=/work/node_modules',
      '-v',
      'D:\\repo:/work',
      '-v',
      'D:\\runs\\run-123\\tests:/generated-tests',
      '-v',
      'D:\\runs\\run-123\\execution:/generated-output',
      '-w',
      '/work',
      'mcr.microsoft.com/playwright:v1.46.1-jammy',
      'npx',
      'playwright',
      'test',
      '--config',
      '/work/.playwright-configs/run-123.docker.config.generated.ts',
    ]);
    expect(plan.configTestDir).toBe('/generated-tests');
    expect(plan.configOutputDir).toBe('/generated-output');
  });
});