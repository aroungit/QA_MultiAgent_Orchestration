import type { EvaluateInputFile } from '../types.js';

const MIN_LENGTH = 20;
const GOOD_LENGTH = 120;
const STRUCTURE_SIGNAL = /(^\s*[-*\d]+[.)]\s|\n\s*[-*\d]+[.)]\s|:\n|\. .+\. )/m;

function isParseableStructuredFile(file: EvaluateInputFile): boolean | undefined {
  if (!file.content) return undefined;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    try {
      JSON.parse(file.content);
      return true;
    } catch {
      return false;
    }
  }
  // yaml/md/txt have no strict grammar to validate here; treat presence of content as fine.
  return true;
}

/** Scores 0..1: does the combined input have enough length and recognizable structure? */
export function structureOk(rawText: string, files: EvaluateInputFile[]): number {
  const combinedLength = rawText.length + files.reduce((sum, f) => sum + (f.content?.length ?? 0), 0);

  if (combinedLength === 0) return 0;

  let score = 0;
  score += Math.min(1, combinedLength / GOOD_LENGTH) * 0.6;
  score += combinedLength >= MIN_LENGTH ? 0.2 : 0;
  score += STRUCTURE_SIGNAL.test(rawText) ? 0.2 : 0;

  const structuredFiles = files.map(isParseableStructuredFile).filter((r) => r !== undefined);
  if (structuredFiles.length > 0) {
    const validRatio = structuredFiles.filter(Boolean).length / structuredFiles.length;
    score = score * 0.7 + validRatio * 0.3;
  }

  return Math.max(0, Math.min(1, score));
}
