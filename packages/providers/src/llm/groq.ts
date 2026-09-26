import type { ChatMessage, ChatOptions, ChatResult, LlmAdapter } from '../types.js';
import { ProviderConfigError, ProviderRateLimitError } from '../types.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqChatResponse {
  model: string;
  choices: Array<{ message: { content: string } }>;
}

/** Groq LLM adapter (OpenAI-compatible chat completions API). */
export class GroqAdapter implements LlmAdapter {
  readonly provider = 'groq' as const;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    if (!apiKey) throw new ProviderConfigError('Missing GROQ_API_KEY');
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model ?? this.defaultModel;
    const request = {
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
    };

    let res = await fetch(GROQ_API_URL, request);
    let rateLimitBody: string | undefined;
    for (let attempt = 0; res.status === 429 && attempt < 2; attempt += 1) {
      rateLimitBody = await res.text();
      const retryMatch = rateLimitBody.match(/in (?:(\d+)m)?([\d.]+)s/);
      const retrySeconds = retryMatch ? Number(retryMatch[1] ?? 0) * 60 + Number(retryMatch[2]) : 0;
      // Do not hold an API request open for a daily quota reset. The caller can retry later.
      if (retrySeconds > 10 || !retryMatch) {
        throw new ProviderRateLimitError(`Groq rate limit exceeded: ${rateLimitBody}`, retrySeconds || undefined);
      }
      const delayMs = Math.max(1000 * (attempt + 1), Math.ceil(retrySeconds * 1000) + 250);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      res = await fetch(GROQ_API_URL, request);
    }

    if (!res.ok) {
      if (res.status === 429) {
        throw new ProviderRateLimitError(`Groq rate limit exceeded: ${rateLimitBody ?? (await res.text())}`);
      }
      throw new Error(`Groq chat request failed: ${res.status} ${rateLimitBody ?? (await res.text())}`);
    }

    const data = (await res.json()) as GroqChatResponse;
    return {
      content: data.choices[0]?.message.content ?? '',
      provider: this.provider,
      model: data.model ?? model,
      raw: data,
    };
  }
}
