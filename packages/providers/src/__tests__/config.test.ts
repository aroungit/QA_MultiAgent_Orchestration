import { describe, expect, it } from 'vitest';
import { resolveProviderConfig } from '../config.js';
import type { ProvidersEnv } from '../env.js';

const env: ProvidersEnv = {
  DEFAULT_LLM_PROVIDER: 'groq',
  DEFAULT_LLM_MODEL: 'llama-3.1-70b-versatile',
  DEFAULT_EMBEDDINGS_PROVIDER: 'voyage',
  DEFAULT_EMBEDDINGS_MODEL: 'voyage-3',
};

describe('resolveProviderConfig', () => {
  it('falls back to env defaults when no selection is given', () => {
    expect(resolveProviderConfig({}, env)).toEqual({
      llmProvider: 'groq',
      llmModel: 'llama-3.1-70b-versatile',
      embeddingsProvider: 'voyage',
      embeddingsModel: 'voyage-3',
    });
  });

  it('honors explicit run selection over env defaults', () => {
    expect(
      resolveProviderConfig(
        {
          llmProvider: 'cohere',
          llmModel: 'command-r-plus',
          embeddingsProvider: 'jina',
          embeddingsModel: 'jina-embeddings-v3',
        },
        env,
      ),
    ).toEqual({
      llmProvider: 'cohere',
      llmModel: 'command-r-plus',
      embeddingsProvider: 'jina',
      embeddingsModel: 'jina-embeddings-v3',
    });
  });

  it('partially overrides only specified fields', () => {
    expect(resolveProviderConfig({ llmProvider: 'openrouter' }, env)).toEqual({
      llmProvider: 'openrouter',
      llmModel: 'llama-3.1-70b-versatile',
      embeddingsProvider: 'voyage',
      embeddingsModel: 'voyage-3',
    });
  });
});
