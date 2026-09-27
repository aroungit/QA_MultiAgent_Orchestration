import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stageApprovedTests, summarizePlaywrightReport } from '../index.js';

describe('stageApprovedTests', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-agent-playwright-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('copies only the approved spec files into a clean staging directory', () => {
    const testDir = path.join(tempRoot, 'tests');
    const outputDir = path.join(tempRoot, 'execution');
    fs.mkdirSync(path.join(outputDir, 'approved-tests'), { recursive: true });
    fs.mkdirSync(testDir, { recursive: true });

    const approvedSpec = path.join(testDir, 'approved.spec.ts');
    const staleSpec = path.join(testDir, 'stale.v2.spec.ts');
    fs.writeFileSync(approvedSpec, 'test("approved", async () => {});', 'utf-8');
    fs.writeFileSync(staleSpec, 'test("stale", async () => {});', 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'approved-tests', 'old.spec.ts'), 'old', 'utf-8');

    const stagedDir = stageApprovedTests(testDir, outputDir, [approvedSpec]);

    expect(stagedDir).toBe(path.join(outputDir, 'approved-tests'));
    expect(fs.readdirSync(stagedDir)).toEqual(['approved.spec.ts']);
  });

  it('falls back to the original test directory when no approved file list is provided', () => {
    const testDir = path.join(tempRoot, 'tests');
    const outputDir = path.join(tempRoot, 'execution');
    fs.mkdirSync(testDir, { recursive: true });

    expect(stageApprovedTests(testDir, outputDir, undefined)).toBe(testDir);
  });

  it('separates infrastructure failures from assertion failures in the execution summary', () => {
    const result = summarizePlaywrightReport({
      suites: [
        {
          specs: [
            {
              tests: [
                {
                  results: [
                    { status: 'passed' },
                    {
                      status: 'failed',
                      workerIndex: -1,
                      parallelIndex: -1,
                      error: { message: 'Cannot find module run-123.config.generated.ts' },
                    },
                    {
                      status: 'failed',
                      workerIndex: 0,
                      parallelIndex: 0,
                      error: { message: 'Expected dashboard heading to be visible' },
                    },
                    { status: 'skipped' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.summary).toEqual({
      total: 4,
      passed: 1,
      failed: 1,
      skipped: 1,
      infrastructureFailures: 1,
      failureMode: 'mixed',
    });
    expect(result.infrastructureErrors).toEqual(['Cannot find module run-123.config.generated.ts']);
  });
});