/** Trims, strips a leading BOM, normalizes line endings, and collapses excess blank lines/whitespace. */
export function normalizeInput(rawText: string): string {
  return rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
