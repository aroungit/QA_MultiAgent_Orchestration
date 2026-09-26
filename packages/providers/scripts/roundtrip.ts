/**
 * Round-trips a single prompt through every LLM provider that has an API key configured
 * in `.env`. Providers without a key are skipped with a warning.
 *
 * Usage: npm run roundtrip --workspace packages/providers
 */
import { createLlmAdapter } from '../src/llm/factory.js';
import { loadProvidersEnv } from '../src/env.js';
import { ProviderConfigError } from '../src/types.js';
import type { LlmProvider } from '@qa-agent/shared';

const PROMPT = "Reply with exactly one word: 'pong'.";
const PROVIDERS: LlmProvider[] = ['groq', 'cohere', 'openrouter'];

async function main() {
  const env = loadProvidersEnv();

  for (const provider of PROVIDERS) {
    try {
      const adapter = createLlmAdapter(provider, env);
      const result = await adapter.chat([{ role: 'user', content: PROMPT }]);
      console.log(`[${provider}] model=${result.model} response=${result.content.trim()}`);
    } catch (err) {
      if (err instanceof ProviderConfigError) {
        console.warn(`[${provider}] skipped: ${err.message}`);
      } else {
        console.error(`[${provider}] failed:`, err);
      }
    }
  }
}

main();
