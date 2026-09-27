import { z } from 'zod';

export const preservedValueSchema = z.object({
  label: z.string(),
  value: z.string(),
  notes: z.string().optional(),
});
export type PreservedValue = z.infer<typeof preservedValueSchema>;

export const requirementSchema = z.object({
  requirementId: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.string().optional(),
  testable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  comments: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  exampleValues: z.array(preservedValueSchema).default([]),
  testData: z.array(preservedValueSchema).default([]),
});
export type Requirement = z.infer<typeof requirementSchema>;

export const requirementsDocumentSchema = z.object({
  runId: z.string(),
  requirements: z.array(requirementSchema),
});
export type RequirementsDocument = z.infer<typeof requirementsDocumentSchema>;

export const testCaseSchema = z.object({
  testCaseId: z.string(),
  title: z.string(),
  preconditions: z.array(z.string()).default([]),
  steps: z.array(z.string()),
  expectedResults: z.array(z.string()),
  traceability: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).default([]),
  comments: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  exampleValues: z.array(preservedValueSchema).default([]),
  testData: z.array(preservedValueSchema).default([]),
});
export type TestCase = z.infer<typeof testCaseSchema>;

export const testCasesDocumentSchema = z.object({
  runId: z.string(),
  testCases: z.array(testCaseSchema),
});
export type TestCasesDocument = z.infer<typeof testCasesDocumentSchema>;

export const automationSpecFileSchema = z.object({
  filename: z.string().regex(/\.spec\.ts$/, 'filename must end with .spec.ts'),
  testCaseIds: z.array(z.string()).min(1),
  code: z.string().min(1),
});
export type AutomationSpecFile = z.infer<typeof automationSpecFileSchema>;

export const automationDocumentSchema = z.object({
  runId: z.string(),
  files: z.array(automationSpecFileSchema).min(1),
});
export type AutomationDocument = z.infer<typeof automationDocumentSchema>;
