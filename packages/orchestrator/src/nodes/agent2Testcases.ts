import { getLlmAdapter } from '@qa-agent/providers';
import { requirementsDocumentSchema, testCasesDocumentSchema, type TestCasesDocument } from '@qa-agent/shared';
import { extractJson } from '../llmJson.js';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { readRunArtifact, writeRunArtifact } from '../workspace.js';

const SYSTEM_PROMPT = `You are a QA test case designer. Given a normalized list of approved requirements, derive \
a set of detailed, executable test cases.

Respond with ONLY a single JSON object (no markdown fences, no commentary) of this exact shape:
{
  "runId": string,
  "testCases": [
    {
      "testCaseId": string,
      "title": string,
      "preconditions": string[],
      "steps": string[],
      "expectedResults": string[],
      "traceability": string[],
      "priority": "low" | "medium" | "high" | "critical",
      "tags": string[]
    }
  ]
}

Rules:
- testCaseId values must be unique, formatted like "TC-001", "TC-002", ...
- Every requirement should be covered by at least one test case.
- "traceability" must only contain requirementId values from the provided requirements list; never invent new ones.
- Prefer multiple focused test cases over one large test case when a requirement has several distinct behaviors.
- "steps" and "expectedResults" must be concrete and executable, not vague restatements of the requirement.`;

function renderSummaryMarkdown(doc: TestCasesDocument): string {
  const lines = ['# Test Cases Summary', '', `Run: \`${doc.runId}\``, `Total test cases: ${doc.testCases.length}`, ''];
  for (const tc of doc.testCases) {
    lines.push(`## ${tc.testCaseId}: ${tc.title}`, '');
    lines.push(`- Priority: ${tc.priority}`);
    lines.push(`- Traceability: ${tc.traceability.join(', ') || '(none)'}`);
    if (tc.tags.length) lines.push(`- Tags: ${tc.tags.join(', ')}`);
    if (tc.preconditions.length) {
      lines.push('', 'Preconditions:');
      for (const pre of tc.preconditions) lines.push(`- ${pre}`);
    }
    lines.push('', 'Steps:');
    tc.steps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('', 'Expected Results:');
    tc.expectedResults.forEach((result, i) => lines.push(`${i + 1}. ${result}`));
    lines.push('');
  }
  return lines.join('\n');
}

/** Agent 2: derives traceable test cases from the approved requirements document via the configured LLM. */
export async function agent2Testcases(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  if (!state.requirements.requirementsJsonPath) {
    throw new Error('agent2Testcases: no approved requirements.json to consume');
  }

  const requirementsDoc = requirementsDocumentSchema.parse(
    JSON.parse(readRunArtifact(state.runId, 'requirements', 'requirements.json')),
  );
  if (requirementsDoc.requirements.length === 0) {
    throw new Error('agent2Testcases: requirements document has no requirements to derive test cases from');
  }

  const adapter = getLlmAdapter({
    llmProvider: state.config.llmProvider,
    llmModel: state.config.llmModel,
  });

  const chat = await adapter.chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `runId: ${state.runId}\n\nApproved requirements:\n${JSON.stringify(requirementsDoc.requirements, null, 2)}`,
      },
    ],
    { temperature: 0.2 },
  );

  const doc = testCasesDocumentSchema.parse({
    ...(extractJson(chat.content) as object),
    runId: state.runId,
  });

  const requirementIds = new Set(requirementsDoc.requirements.map((r) => r.requirementId));
  for (const testCase of doc.testCases) {
    for (const requirementId of testCase.traceability) {
      if (!requirementIds.has(requirementId)) {
        throw new Error(
          `agent2Testcases: test case ${testCase.testCaseId} traces to unknown requirement "${requirementId}"`,
        );
      }
    }
  }

  const testCasesJsonPath = writeRunArtifact(
    state.runId,
    'testcases',
    'testcases.json',
    JSON.stringify(doc, null, 2),
  );
  const summaryMarkdownPath = writeRunArtifact(
    state.runId,
    'testcases',
    'testcases_summary.md',
    renderSummaryMarkdown(doc),
  );

  return {
    status: 'waiting_hitl',
    currentPhase: 'hitl_testcases',
    testCases: {
      testCasesJsonPath,
      summaryMarkdownPath,
      hitlStatus: 'pending',
    },
  };
}
