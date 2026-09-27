import { getLlmAdapter } from '@qa-agent/providers';
import { requirementsDocumentSchema, type RequirementsDocument } from '@qa-agent/shared';
import { extractJson } from '../llmJson.js';
import { appendRevisionSuffix, buildRegenerationPrompt, nextRevision } from '../regeneration.js';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { readRunArtifactByPath, writeRunArtifact } from '../workspace.js';

const SYSTEM_PROMPT = `You are a QA requirements analyst. Given raw, unstructured requirements text, extract a \
normalized, traceable list of requirements.

Respond with ONLY a single JSON object (no markdown fences, no commentary) of this exact shape:
{
  "runId": string,
  "requirements": [
    {
      "requirementId": string,
      "title": string,
      "description": string,
      "source": string (optional),
      "testable": boolean,
      "tags": string[],
      "comments": string[],
      "notes": string[],
      "exampleValues": [{ "label": string, "value": string, "notes": string (optional) }],
      "testData": [{ "label": string, "value": string, "notes": string (optional) }]
    }
  ]
}

Rules:
- requirementId values must be unique, formatted like "REQ-001", "REQ-002", ...
- Split the input into atomic, individually testable requirements; do not merge unrelated behaviors.
- "testable" is false only when the requirement is too vague to derive verifiable test steps.
- "tags" are short lowercase keywords (e.g. "auth", "performance").
- Preserve explicit reviewer comments, notes, sample values, credentials, names, amounts, labels, and other human-supplied test data in the structured fields instead of burying them in description text.
- Keep structured values literal. Do not redact, normalize, or invent replacements unless the source text itself does so.`;

function renderPreservedValues(label: string, values: RequirementsDocument['requirements'][number]['exampleValues']): string[] {
  if (values.length === 0) return [];

  const lines = [label];
  for (const value of values) {
    lines.push(`- ${value.label}: ${value.value}${value.notes ? ` (${value.notes})` : ''}`);
  }
  return lines;
}

function renderSummaryMarkdown(doc: RequirementsDocument): string {
  const lines = [
    '# Requirements Summary',
    '',
    `Run: \`${doc.runId}\``,
    `Total requirements: ${doc.requirements.length}`,
    '',
  ];
  for (const req of doc.requirements) {
    lines.push(`## ${req.requirementId}: ${req.title}`, '', req.description, '');
    lines.push(`- Testable: ${req.testable ? 'yes' : 'no'}`);
    if (req.source) lines.push(`- Source: ${req.source}`);
    if (req.tags.length) lines.push(`- Tags: ${req.tags.join(', ')}`);
    if (req.comments.length) lines.push(`- Comments: ${req.comments.join(' | ')}`);
    if (req.notes.length) lines.push(`- Notes: ${req.notes.join(' | ')}`);
    lines.push(...renderPreservedValues('Example values:', req.exampleValues));
    lines.push(...renderPreservedValues('Structured test data:', req.testData));
    lines.push('');
  }
  return lines.join('\n');
}

/** Agent 1: extracts normalized, traceable requirements from raw input text via the configured LLM. */
export async function agent1Requirements(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  const rawText = state.input.rawText?.trim();
  if (!rawText) {
    throw new Error('agent1Requirements: run has no raw text input to extract requirements from');
  }

  const revision = nextRevision(state.requirements.revision);
  const latestFeedback = state.requirements.hitlStatus === 'rejected'
    ? state.requirements.regenerationHistory?.at(-1)
    : undefined;
  const priorRequirements = latestFeedback && state.requirements.requirementsJsonPath
    ? readRunArtifactByPath(state.requirements.requirementsJsonPath)
    : undefined;

  const adapter = getLlmAdapter({
    llmProvider: state.config.llmProvider,
    llmModel: state.config.llmModel,
  });

  const chat = await adapter.chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          `runId: ${state.runId}`,
          '',
          `Raw requirements input:\n${rawText}`,
          buildRegenerationPrompt('Requirements', latestFeedback, priorRequirements),
        ]
          .filter((value): value is string => Boolean(value))
          .join('\n\n'),
      },
    ],
    { temperature: 0.2 },
  );

  const doc = requirementsDocumentSchema.parse({
    ...(extractJson(chat.content) as object),
    runId: state.runId,
  });

  const requirementsJsonPath = writeRunArtifact(
    state.runId,
    'requirements',
    appendRevisionSuffix('requirements.json', revision),
    JSON.stringify(doc, null, 2),
  );
  const summaryMarkdownPath = writeRunArtifact(
    state.runId,
    'requirements',
    appendRevisionSuffix('summary.md', revision),
    renderSummaryMarkdown(doc),
  );

  return {
    status: 'waiting_hitl',
    currentPhase: 'hitl_requirements',
    requirements: {
      requirementsJsonPath,
      summaryMarkdownPath,
      hitlStatus: 'pending',
      hitlComments: undefined,
      revision,
      regenerationHistory: state.requirements.regenerationHistory ?? [],
    },
  };
}
