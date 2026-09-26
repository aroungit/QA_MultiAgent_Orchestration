import type { JeveDecision } from '@qa-agent/shared';

export type JevCheckName = JeveDecision['name'];
export type JevOutcome = JeveDecision['outcome'];

export interface JevThresholds {
  /** Probability at/above this value auto-accepts a check. */
  accept: number;
  /** Probability at/above this value (but below `accept`) flags a check for review. */
  flag: number;
}

export interface JevConfig {
  enabledChecks: JevCheckName[];
  thresholds: JevThresholds;
}

export interface EvaluateInputFile {
  name: string;
  /** Extracted text content, when available (skipped for binary formats like pdf/docx). */
  content?: string;
}

export interface EvaluateInputParams {
  rawText?: string;
  files?: EvaluateInputFile[];
  config?: Partial<JevConfig>;
}

export interface EvaluateInputResult {
  valid: boolean;
  decisions: JeveDecision[];
  probabilities: Record<JevCheckName, number>;
  normalizedInput: string;
  errors?: string[];
}

export type JevCheckFn = (rawText: string, files: EvaluateInputFile[]) => number;
