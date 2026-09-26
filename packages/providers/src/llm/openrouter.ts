import type { ChatMessage, ChatOptions, ChatResult, LlmAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterChatResponse {
  model: string;
  choices: Array<{ message: { content: string } }>;
}

/** OpenRouter LLM adapter (OpenAI-compatible chat completions API). */
export class OpenRouterAdapter implements LlmAdapter {
  readonly provider = 'openrouter' as const;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    if (!apiKey) throw new ProviderConfigError('Missing OPENROUTER_API_KEY');
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model ?? this.defaultModel;
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter chat request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as OpenRouterChatResponse;
    return {
      content: data.choices[0]?.message.content ?? '',
      provider: this.provider,
      model: data.model ?? model,
      raw: data,
    };
  }
}
