import { getLlmAdapter } from '@qa-agent/providers';
import { requirementsDocumentSchema, type RequirementsDocument } from '@qa-agent/shared';
import { extractJson } from '../llmJson.js';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { writeRunArtifact } from '../workspace.js';

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
      "tags": string[]
    }
  ]
}

Rules:
- requirementId values must be unique, formatted like "REQ-001", "REQ-002", ...
- Split the input into atomic, individually testable requirements; do not merge unrelated behaviors.
- "testable" is false only when the requirement is too vague to derive verifiable test steps.
- "tags" are short lowercase keywords (e.g. "auth", "performance").`;

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

  const adapter = getLlmAdapter({
    llmProvider: state.config.llmProvider,
    llmModel: state.config.llmModel,
  });

  const chat = await adapter.chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `runId: ${state.runId}\n\nRaw requirements input:\n${rawText}` },
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
    'requirements.json',
    JSON.stringify(doc, null, 2),
  );
  const summaryMarkdownPath = writeRunArtifact(
    state.runId,
    'requirements',
    'summary.md',
    renderSummaryMarkdown(doc),
  );

  return {
    status: 'waiting_hitl',
    currentPhase: 'hitl_requirements',
    requirements: {
      requirementsJsonPath,
      summaryMarkdownPath,
      hitlStatus: 'pending',
    },
  };
}
