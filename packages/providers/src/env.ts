import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { REPO_ROOT } from './paths.js';

const envSchema = z.object({
  GROQ_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  VOYAGE_API_KEY: z.string().optional(),
  JINA_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  DEFAULT_LLM_PROVIDER: z.enum(['groq', 'cohere', 'openrouter']).default('groq'),
  DEFAULT_LLM_MODEL: z.string().default('llama-3.1-70b-versatile'),
  DEFAULT_EMBEDDINGS_PROVIDER: z.enum(['voyage', 'jina', 'mistral']).default('voyage'),
  DEFAULT_EMBEDDINGS_MODEL: z.string().default('voyage-3'),
});

export type ProvidersEnv = z.infer<typeof envSchema>;

let cached: ProvidersEnv | undefined;

/** Loads `.env` from the repo root (once) and validates provider-related variables. */
export function loadProvidersEnv(): ProvidersEnv {
  if (cached) return cached;

  const envPath = path.resolve(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  cached = envSchema.parse(process.env);
  return cached;
}

/** Test-only helper to force re-reading `process.env` on the next `loadProvidersEnv()` call. */
export function resetProvidersEnvCache(): void {
  cached = undefined;
}
