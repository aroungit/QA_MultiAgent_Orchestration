import type { EmbedOptions, EmbedResult, EmbeddingsAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/embeddings';

interface MistralEmbeddingsResponse {
  model: string;
  data: Array<{ embedding: number[] }>;
}

/** Mistral embeddings adapter. */
export class MistralAdapter implements EmbeddingsAdapter {
  readonly provider = 'mistral' as const;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    if (!apiKey) throw new ProviderConfigError('Missing MISTRAL_API_KEY');
  }

  async embed(texts: string[], options: EmbedOptions = {}): Promise<EmbedResult> {
    const model = options.model ?? this.defaultModel;
    const res = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: texts }),
    });

    if (!res.ok) {
      throw new Error(`Mistral embeddings request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as MistralEmbeddingsResponse;
    return {
      embeddings: data.data.map((d) => d.embedding),
      provider: this.provider,
      model: data.model ?? model,
      raw: data,
    };
  }
}
