import type { EmbeddingsProvider, LlmProvider } from '@qa-agent/shared';
import { loadProvidersEnv, type ProvidersEnv } from './env.js';
import { createEmbeddingsAdapter } from './embeddings/factory.js';
import { createLlmAdapter } from './llm/factory.js';
import type { EmbeddingsAdapter, LlmAdapter } from './types.js';

export interface RunProviderSelection {
  llmProvider?: LlmProvider;
  llmModel?: string;
  embeddingsProvider?: EmbeddingsProvider;
  embeddingsModel?: string;
}

export interface ResolvedProviderConfig {
  llmProvider: LlmProvider;
  llmModel: string;
  embeddingsProvider: EmbeddingsProvider;
  embeddingsModel: string;
}

/** Fills in unspecified provider/model selections with `.env`-configured defaults. */
export function resolveProviderConfig(
  selection: RunProviderSelection = {},
  env: ProvidersEnv = loadProvidersEnv(),
): ResolvedProviderConfig {
  return {
    llmProvider: selection.llmProvider ?? env.DEFAULT_LLM_PROVIDER,
    llmModel: selection.llmModel ?? env.DEFAULT_LLM_MODEL,
    embeddingsProvider: selection.embeddingsProvider ?? env.DEFAULT_EMBEDDINGS_PROVIDER,
    embeddingsModel: selection.embeddingsModel ?? env.DEFAULT_EMBEDDINGS_MODEL,
  };
}

/** Resolves the run's provider selection (or defaults) and builds the corresponding LLM adapter. */
export function getLlmAdapter(
  selection: RunProviderSelection = {},
  env: ProvidersEnv = loadProvidersEnv(),
): LlmAdapter {
  const resolved = resolveProviderConfig(selection, env);
  return createLlmAdapter(resolved.llmProvider, env, resolved.llmModel);
}

/** Resolves the run's provider selection (or defaults) and builds the corresponding embeddings adapter. */
export function getEmbeddingsAdapter(
  selection: RunProviderSelection = {},
  env: ProvidersEnv = loadProvidersEnv(),
): EmbeddingsAdapter {
  const resolved = resolveProviderConfig(selection, env);
  return createEmbeddingsAdapter(resolved.embeddingsProvider, env, resolved.embeddingsModel);
}
