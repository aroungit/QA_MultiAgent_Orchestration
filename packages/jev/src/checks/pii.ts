import type { EvaluateInputFile } from '../types.js';

/** High-confidence secret patterns: presence of any one strongly indicates a leaked credential. */
const HIGH_CONFIDENCE_SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN[ A-Z]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\bASIA[0-9A-Z]{16}\b/, // AWS temporary access key id
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, // GitHub tokens
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, // Slack tokens
  /\bsk-[A-Za-z0-9]{20,}\b/, // OpenAI-style secret keys
  /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/i,
];

const MODERATE_SIGNAL_PATTERNS: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, // email
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone number
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN-like
  /\b(?:\d[ -]*?){13,19}\b/, // credit-card-like digit run
];

function countMatches(patterns: RegExp[], text: string): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

/** Scores 0..1: probability that the input contains NO PII/secrets (higher is better/safer). */
export function noPiiSecrets(rawText: string, files: EvaluateInputFile[]): number {
  const combined = [rawText, ...files.map((f) => f.content ?? '')].join('\n');

  const highConfidenceHits = countMatches(HIGH_CONFIDENCE_SECRET_PATTERNS, combined);
  if (highConfidenceHits > 0) {
    return Math.max(0, 0.1 - highConfidenceHits * 0.05);
  }

  const moderateHits = countMatches(MODERATE_SIGNAL_PATTERNS, combined);
  if (moderateHits === 0) return 1;

  return Math.max(0, 1 - moderateHits * 0.3);
}
