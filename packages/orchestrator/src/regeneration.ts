import type { RegenerationHistoryEntry } from '@qa-agent/shared';

export function nextRevision(currentRevision?: number): number {
  return (currentRevision ?? 0) + 1;
}

export function appendRevisionSuffix(filename: string, revision: number): string {
  if (revision <= 1) return filename;

  if (filename.endsWith('.spec.ts')) {
    return `${filename.slice(0, -'.spec.ts'.length)}.v${revision}.spec.ts`;
  }

  const extensionIndex = filename.lastIndexOf('.');
  if (extensionIndex === -1) {
    return `${filename}.v${revision}`;
  }

  return `${filename.slice(0, extensionIndex)}.v${revision}${filename.slice(extensionIndex)}`;
}

export function recordRegenerationFeedback(
  revision: number | undefined,
  comments: string | undefined,
  artifactPaths: Array<string | undefined>,
  history: RegenerationHistoryEntry[] | undefined,
): RegenerationHistoryEntry[] {
  const normalizedComments = comments?.trim() || 'No reviewer comments provided.';
  const entry: RegenerationHistoryEntry = {
    iteration: revision && revision > 0 ? revision : 1,
    comments: normalizedComments,
    artifactPaths: artifactPaths.filter((path): path is string => Boolean(path)),
  };

  return [...(history ?? []), entry];
}

export function buildRegenerationPrompt(
  stageName: string,
  latestFeedback?: RegenerationHistoryEntry,
  priorArtifact?: string,
): string | undefined {
  if (!latestFeedback) return undefined;

  const lines = [
    `${stageName} feedback from the previous review cycle:`,
    `- Rejected iteration: ${latestFeedback.iteration}`,
    `- Reviewer comments: ${latestFeedback.comments}`,
    '- Regenerate the artifact by addressing this feedback explicitly while preserving valid existing content.',
  ];

  if (priorArtifact) {
    lines.push('', 'Previous artifact to revise:', priorArtifact);
  }

  return lines.join('\n');
}