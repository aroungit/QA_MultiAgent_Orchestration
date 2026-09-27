import { z } from 'zod';

export const llmProviderSchema = z.enum(['groq', 'cohere', 'openrouter']);
export const embeddingsProviderSchema = z.enum(['voyage', 'jina', 'mistral']);
export const executionBackendSchema = z.enum(['local', 'docker']);

export const runConfigSchema = z.object({
  llmProvider: llmProviderSchema,
  llmModel: z.string().min(1),
  embeddingsProvider: embeddingsProviderSchema,
  embeddingsModel: z.string().min(1),
  enableHITLAutomation: z.boolean().default(false),
  executionBackend: executionBackendSchema.default('local'),
});

export const createRunRequestSchema = z.object({
  rawText: z.string().optional(),
  config: runConfigSchema.partial().optional(),
});
export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;

export const hitlDecisionRequestSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
  configOverride: runConfigSchema
    .pick({
      llmProvider: true,
      llmModel: true,
      embeddingsProvider: true,
      embeddingsModel: true,
      enableHITLAutomation: true,
      executionBackend: true,
    })
    .partial()
    .optional(),
});
export type HitlDecisionRequest = z.infer<typeof hitlDecisionRequestSchema>;
