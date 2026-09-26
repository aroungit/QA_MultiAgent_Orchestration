import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmbeddingsAdapter } from '../embeddings/factory.js';
import { JinaAdapter } from '../embeddings/jina.js';
import { MistralAdapter } from '../embeddings/mistral.js';
import { VoyageAdapter } from '../embeddings/voyage.js';
import { ProviderConfigError } from '../types.js';
import type { ProvidersEnv } from '../env.js';

function baseEnv(overrides: Partial<ProvidersEnv> = {}): ProvidersEnv {
  return {
    DEFAULT_LLM_PROVIDER: 'groq',
    DEFAULT_LLM_MODEL: 'llama-3.1-70b-versatile',
    DEFAULT_EMBEDDINGS_PROVIDER: 'voyage',
    DEFAULT_EMBEDDINGS_MODEL: 'voyage-3',
    ...overrides,
  };
}

describe('Embeddings adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('VoyageAdapter sends embed request and parses response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'voyage-3', data: [{ embedding: [0.1, 0.2] }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new VoyageAdapter('voyage-key', 'voyage-3');
    const result = await adapter.embed(['hello']);

    expect(result.embeddings).toEqual([[0.1, 0.2]]);
    expect(result.provider).toBe('voyage');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.voyageai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer voyage-key' }),
      }),
    );
  });

  it('JinaAdapter sends embed request and parses response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ model: 'jina-embeddings-v3', data: [{ embedding: [0.3] }] }),
      }),
    );
    const adapter = new JinaAdapter('jina-key', 'jina-embeddings-v3');
    const result = await adapter.embed(['hello']);
    expect(result.embeddings).toEqual([[0.3]]);
    expect(result.provider).toBe('jina');
  });

  it('MistralAdapter sends embed request and parses response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ model: 'mistral-embed', data: [{ embedding: [0.4] }] }),
      }),
    );
    const adapter = new MistralAdapter('mistral-key', 'mistral-embed');
    const result = await adapter.embed(['hello']);
    expect(result.embeddings).toEqual([[0.4]]);
    expect(result.provider).toBe('mistral');
  });

  it('adapter throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' }),
    );
    const adapter = new VoyageAdapter('key', 'voyage-3');
    await expect(adapter.embed(['hi'])).rejects.toThrow(/500/);
  });

  it('createEmbeddingsAdapter builds the right adapter per provider', () => {
    const env = baseEnv({ VOYAGE_API_KEY: 'v', JINA_API_KEY: 'j', MISTRAL_API_KEY: 'm' });
    expect(createEmbeddingsAdapter('voyage', env)).toBeInstanceOf(VoyageAdapter);
    expect(createEmbeddingsAdapter('jina', env)).toBeInstanceOf(JinaAdapter);
    expect(createEmbeddingsAdapter('mistral', env)).toBeInstanceOf(MistralAdapter);
  });

  it('createEmbeddingsAdapter throws ProviderConfigError when API key is missing', () => {
    expect(() => createEmbeddingsAdapter('voyage', baseEnv())).toThrow(ProviderConfigError);
  });
});
