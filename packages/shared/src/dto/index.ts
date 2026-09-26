import { z } from 'zod';

export const llmProviderSchema = z.enum(['groq', 'cohere', 'openrouter']);
export const embeddingsProviderSchema = z.enum(['voyage', 'jina', 'mistral']);

export const runConfigSchema = z.object({
  llmProvider: llmProviderSchema,
  llmModel: z.string().min(1),
  embeddingsProvider: embeddingsProviderSchema,
  embeddingsModel: z.string().min(1),
  enableHITLAutomation: z.boolean().default(false),
});

export const createRunRequestSchema = z.object({
  rawText: z.string().optional(),
  config: runConfigSchema.partial().optional(),
});
export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;

export const hitlDecisionRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
});
export type HitlDecisionRequest = z.infer<typeof hitlDecisionRequestSchema>;
