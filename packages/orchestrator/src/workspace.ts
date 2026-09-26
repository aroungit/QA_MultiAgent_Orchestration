import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './paths.js';

function resolveWorkspaceRoot(): string {
  const configured = process.env.WORKSPACE_ROOT ?? './workspace';
  return path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT, configured);
}

/** Resolves the absolute path of `workspace/<runId>/<subdir>`, creating it if needed. */
export function resolveRunDir(runId: string, subdir: string): string {
  const dir = path.join(resolveWorkspaceRoot(), runId, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Writes a UTF-8 artifact under `workspace/<runId>/<subdir>/<filename>`, creating dirs as needed. */
export function writeRunArtifact(runId: string, subdir: string, filename: string, content: string): string {
  const dir = path.join(resolveWorkspaceRoot(), runId, subdir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
  return path.join('workspace', runId, subdir, filename).split(path.sep).join('/');
}

/** Reads a UTF-8 artifact previously written via `writeRunArtifact` for the same runId/subdir/filename. */
export function readRunArtifact(runId: string, subdir: string, filename: string): string {
  return fs.readFileSync(path.join(resolveWorkspaceRoot(), runId, subdir, filename), 'utf-8');
}
