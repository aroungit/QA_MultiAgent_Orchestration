import type { EmbedOptions, EmbedResult, EmbeddingsAdapter } from '../types.js';
import { ProviderConfigError } from '../types.js';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

interface VoyageEmbeddingsResponse {
  model: string;
  data: Array<{ embedding: number[] }>;
}

/** Voyage AI embeddings adapter. */
export class VoyageAdapter implements EmbeddingsAdapter {
  readonly provider = 'voyage' as const;

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
  ) {
    if (!apiKey) throw new ProviderConfigError('Missing VOYAGE_API_KEY');
  }

  async embed(texts: string[], options: EmbedOptions = {}): Promise<EmbedResult> {
    const model = options.model ?? this.defaultModel;
    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: texts }),
    });

    if (!res.ok) {
      throw new Error(`Voyage embeddings request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as VoyageEmbeddingsResponse;
    return {
      embeddings: data.data.map((d) => d.embedding),
      provider: this.provider,
      model: data.model ?? model,
      raw: data,
    };
  }
}
