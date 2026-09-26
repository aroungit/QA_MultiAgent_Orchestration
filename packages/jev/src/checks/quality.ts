import type { EvaluateInputFile } from '../types.js';

const PLACEHOLDER_PATTERN = /\b(TODO|TBD|FIXME|lorem ipsum|xxx+|placeholder|\[insert[^\]]*\]|\{\{[^}]*\}\})\b/i;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Scores 0..1: probability that the content is detailed enough and free of placeholders. */
export function contentQuality(rawText: string, files: EvaluateInputFile[]): number {
  const combined = [rawText, ...files.map((f) => f.content ?? '')].join('\n');
  const words = wordCount(combined);

  if (words === 0) return 0;

  let score = Math.min(1, words / 40) * 0.7;

  const sentenceCount = (combined.match(/[.!?](\s|$)/g) ?? []).length;
  score += sentenceCount >= 2 ? 0.3 : sentenceCount * 0.15;

  if (PLACEHOLDER_PATTERN.test(combined)) {
    score = Math.min(score, 0.3);
  }

  return Math.max(0, Math.min(1, score));
}
