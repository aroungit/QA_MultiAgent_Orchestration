import path from 'node:path';
import dotenv from 'dotenv';
import { REPO_ROOT } from './paths.js';

let loaded = false;

/** Loads the repo-root `.env` file into `process.env` (once). Existing env vars are not overridden. */
export function loadEnv(): void {
  if (loaded) return;
  dotenv.config({ path: path.resolve(REPO_ROOT, '.env') });
  loaded = true;
}
