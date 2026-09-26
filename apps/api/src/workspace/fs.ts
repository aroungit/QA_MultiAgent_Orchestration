import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../paths.js';

const RUN_SUBDIRS = ['inputs', 'requirements', 'testcases', 'tests', 'execution'] as const;

export function resolveWorkspaceRoot(): string {
  const configured = process.env.WORKSPACE_ROOT ?? './workspace';
  return path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT, configured);
}

export function runWorkspacePath(runId: string): string {
  return path.join(resolveWorkspaceRoot(), runId);
}

/** Creates the standard `inputs/requirements/testcases/tests/execution` subfolders for a run. */
export function createRunWorkspace(runId: string): string {
  const root = runWorkspacePath(runId);
  for (const sub of RUN_SUBDIRS) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
  return root;
}
