import type { EmbeddingsProvider } from '@qa-agent/shared';
import type { ProvidersEnv } from '../env.js';
import type { EmbeddingsAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';
import { JinaAdapter } from './jina.js';
import { MistralAdapter } from './mistral.js';
import { VoyageAdapter } from './voyage.js';

/** Builds the embeddings adapter for a given provider, using env-configured API keys and default model. */
export function createEmbeddingsAdapter(
  provider: EmbeddingsProvider,
  env: ProvidersEnv,
  defaultModel?: string,
): EmbeddingsAdapter {
  switch (provider) {
    case 'voyage':
      if (!env.VOYAGE_API_KEY) throw new ProviderConfigError('Missing VOYAGE_API_KEY');
      return new VoyageAdapter(env.VOYAGE_API_KEY, defaultModel ?? env.DEFAULT_EMBEDDINGS_MODEL);
    case 'jina':
      if (!env.JINA_API_KEY) throw new ProviderConfigError('Missing JINA_API_KEY');
      return new JinaAdapter(env.JINA_API_KEY, defaultModel ?? env.DEFAULT_EMBEDDINGS_MODEL);
    case 'mistral':
      if (!env.MISTRAL_API_KEY) throw new ProviderConfigError('Missing MISTRAL_API_KEY');
      return new MistralAdapter(env.MISTRAL_API_KEY, defaultModel ?? env.DEFAULT_EMBEDDINGS_MODEL);
    default: {
      const exhaustive: never = provider;
      throw new ProviderConfigError(`Unknown embeddings provider: ${String(exhaustive)}`);
    }
  }
}
