import type { EmbeddingsProvider, LlmProvider } from '@qa-agent/shared';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ChatResult {
  content: string;
  provider: LlmProvider;
  model: string;
  raw?: unknown;
}

export interface LlmAdapter {
  readonly provider: LlmProvider;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}

export interface EmbedOptions {
  model?: string;
}

export interface EmbedResult {
  embeddings: number[][];
  provider: EmbeddingsProvider;
  model: string;
  raw?: unknown;
}

export interface EmbeddingsAdapter {
  readonly provider: EmbeddingsProvider;
  embed(texts: string[], options?: EmbedOptions): Promise<EmbedResult>;
}

export class ProviderConfigError extends Error {}

export class ProviderRateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ProviderRateLimitError';
  }
}
