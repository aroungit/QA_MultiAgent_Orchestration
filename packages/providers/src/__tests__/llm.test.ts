import { afterEach, describe, expect, it, vi } from 'vitest';
import { CohereAdapter } from '../llm/cohere.js';
import { createLlmAdapter } from '../llm/factory.js';
import { GroqAdapter } from '../llm/groq.js';
import { OpenRouterAdapter } from '../llm/openrouter.js';
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

describe('LLM adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GroqAdapter sends chat request and parses response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'llama-3.1-70b-versatile',
        choices: [{ message: { content: 'hello' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new GroqAdapter('test-key', 'llama-3.1-70b-versatile');
    const result = await adapter.chat([{ role: 'user', content: 'hi' }]);

    expect(result).toEqual({
      content: 'hello',
      provider: 'groq',
      model: 'llama-3.1-70b-versatile',
      raw: expect.any(Object),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
  });

  it('GroqAdapter throws ProviderConfigError when API key missing', () => {
    expect(() => new GroqAdapter('', 'model')).toThrow(ProviderConfigError);
  });

  it('CohereAdapter sends chat request and parses response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: [{ text: 'hi there' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new CohereAdapter('cohere-key', 'command-r');
    const result = await adapter.chat([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('hi there');
    expect(result.provider).toBe('cohere');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cohere.com/v2/chat',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('OpenRouterAdapter sends chat request and parses response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'openrouter/model',
        choices: [{ message: { content: 'yo' } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenRouterAdapter('or-key', 'openrouter/model');
    const result = await adapter.chat([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('yo');
    expect(result.provider).toBe('openrouter');
  });

  it('adapter throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }),
    );
    const adapter = new GroqAdapter('bad-key', 'model');
    await expect(adapter.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(/401/);
  });

  it('createLlmAdapter builds the right adapter per provider', () => {
    const env = baseEnv({ GROQ_API_KEY: 'g', COHERE_API_KEY: 'c', OPENROUTER_API_KEY: 'o' });
    expect(createLlmAdapter('groq', env)).toBeInstanceOf(GroqAdapter);
    expect(createLlmAdapter('cohere', env)).toBeInstanceOf(CohereAdapter);
    expect(createLlmAdapter('openrouter', env)).toBeInstanceOf(OpenRouterAdapter);
  });

  it('createLlmAdapter throws ProviderConfigError when API key is missing', () => {
    expect(() => createLlmAdapter('groq', baseEnv())).toThrow(ProviderConfigError);
  });
});
