import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { REPO_ROOT } from './paths.js';

const envSchema = z.object({
  JEV_ACCEPT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  JEV_FLAG_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  TYPESAFE_API_KEY: z.string().optional(),
  TYPESAFE_API_BASE_URL: z.string().default('https://api.typesafe.ai/v1/systemone'),
  TYPESAFE_MODEL: z.string().default('jev-latest'),
});

export type JevEnv = z.infer<typeof envSchema>;

let cached: JevEnv | undefined;

/** Loads `.env` from the repo root (once) and validates JEV threshold overrides. */
export function loadJevEnv(): JevEnv {
  if (cached) return cached;

  const envPath = path.resolve(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  cached = envSchema.parse(process.env);
  return cached;
}

/** Test-only helper to force re-reading `process.env` on the next `loadJevEnv()` call. */
export function resetJevEnvCache(): void {
  cached = undefined;
}
