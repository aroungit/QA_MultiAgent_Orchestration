import type { EmbedOptions, EmbedResult, EmbeddingsAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';

const JINA_API_URL = 'https://api.jina.ai/v1/embeddings';

interface JinaEmbeddingsResponse {
  model: string;
  data: Array<{ embedding: number[] }>;
}

/** Jina AI embeddings adapter. */
export class JinaAdapter implements EmbeddingsAdapter {
  readonly provider = 'jina' as const;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    if (!apiKey) throw new ProviderConfigError('Missing JINA_API_KEY');
  }

  async embed(texts: string[], options: EmbedOptions = {}): Promise<EmbedResult> {
    const model = options.model ?? this.defaultModel;
    const res = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: texts }),
    });

    if (!res.ok) {
      throw new Error(`Jina embeddings request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as JinaEmbeddingsResponse;
    return {
      embeddings: data.data.map((d) => d.embedding),
      provider: this.provider,
      model: data.model ?? model,
      raw: data,
    };
  }
}
