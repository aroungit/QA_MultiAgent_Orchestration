import type { LlmProvider } from '@qa-agent/shared';
import type { ProvidersEnv } from '../env.js';
import type { LlmAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';
import { CohereAdapter } from './cohere.js';
import { GroqAdapter } from './groq.js';
import { OpenRouterAdapter } from './openrouter.js';

/** Builds the LLM adapter for a given provider, using env-configured API keys and default model. */
export function createLlmAdapter(
  provider: LlmProvider,
  env: ProvidersEnv,
  defaultModel?: string,
): LlmAdapter {
  switch (provider) {
    case 'groq':
      if (!env.GROQ_API_KEY) throw new ProviderConfigError('Missing GROQ_API_KEY');
      return new GroqAdapter(env.GROQ_API_KEY, defaultModel ?? env.DEFAULT_LLM_MODEL);
    case 'cohere':
      if (!env.COHERE_API_KEY) throw new ProviderConfigError('Missing COHERE_API_KEY');
      return new CohereAdapter(env.COHERE_API_KEY, defaultModel ?? env.DEFAULT_LLM_MODEL);
    case 'openrouter':
      if (!env.OPENROUTER_API_KEY) throw new ProviderConfigError('Missing OPENROUTER_API_KEY');
      return new OpenRouterAdapter(env.OPENROUTER_API_KEY, defaultModel ?? env.DEFAULT_LLM_MODEL);
    default: {
      const exhaustive: never = provider;
      throw new ProviderConfigError(`Unknown LLM provider: ${String(exhaustive)}`);
    }
  }
}
