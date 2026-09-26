import type { ChatMessage, ChatOptions, ChatResult, LlmAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';

const COHERE_API_URL = 'https://api.cohere.com/v2/chat';

interface CohereChatResponse {
  message: { content: Array<{ text: string }> };
}

/** Cohere LLM adapter (v2 chat API). */
export class CohereAdapter implements LlmAdapter {
  readonly provider = 'cohere' as const;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    if (!apiKey) throw new ProviderConfigError('Missing COHERE_API_KEY');
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model ?? this.defaultModel;
    const res = await fetch(COHERE_API_URL, {
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
      }),
    });

    if (!res.ok) {
      throw new Error(`Cohere chat request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as CohereChatResponse;
    return {
      content: data.message.content.map((c) => c.text).join(''),
      provider: this.provider,
      model,
      raw: data,
    };
  }
}
