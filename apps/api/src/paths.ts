import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This file lives at apps/api/src/paths.ts, so the repo root is three levels up.
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
