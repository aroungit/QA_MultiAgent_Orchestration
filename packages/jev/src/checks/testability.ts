import type { EvaluateInputFile } from '../types.js';

const TESTABLE_SIGNAL = /\b(shall|should|must|will|when|given|then|verify|validate|expected|returns?|displays?|allows?|rejects?|accepts?)\b/gi;
const VAGUE_SIGNAL = /\b(maybe|somehow|possibly|might|etc\.?|and so on|some kind of|various)\b/gi;

/** Scores 0..1: probability that the content reads as a testable requirement/user story. */
export function testableRequirement(rawText: string, files: EvaluateInputFile[]): number {
  const combined = [rawText, ...files.map((f) => f.content ?? '')].join('\n');

  if (combined.trim().length === 0) return 0;

  const testableHits = combined.match(TESTABLE_SIGNAL)?.length ?? 0;
  const vagueHits = combined.match(VAGUE_SIGNAL)?.length ?? 0;

  let score = Math.min(1, testableHits / 3) * 0.8 + 0.1;
  score -= vagueHits * 0.15;

  return Math.max(0, Math.min(1, score));
}
