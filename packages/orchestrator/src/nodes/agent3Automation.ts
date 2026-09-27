import ts from 'typescript';
import { getLlmAdapter } from '@qa-agent/providers';
import { automationDocumentSchema, testCasesDocumentSchema, type AutomationDocument } from '@qa-agent/shared';
import { extractJson } from '../llmJson.js';
import { appendRevisionSuffix, buildRegenerationPrompt, nextRevision } from '../regeneration.js';
import type { OrchestratorStateType, OrchestratorStateUpdate } from '../state.js';
import { readRunArtifactByPath, writeRunArtifact } from '../workspace.js';

const SYSTEM_PROMPT = `You are a QA automation engineer. Given a list of approved, executable test cases, generate \
Playwright (TypeScript) test files that automate them.

Respond with ONLY a single JSON object (no markdown fences, no commentary) of this exact shape:
{
  "runId": string,
  "files": [
    {
      "filename": string,
      "testCaseIds": string[],
      "code": string
    }
  ]
}

Rules:
- "filename" must end with ".spec.ts" and be a valid file name (e.g. "login.spec.ts").
- "testCaseIds" must list every testCaseId (from the provided test cases) automated by this file; never invent new ones.
- "code" contains the full, self-contained file contents as one string; the file must be valid TypeScript importing \`{ test, expect }\` from \`"@playwright/test"\`.
- Every test case must be covered by exactly one \`test(...)\` block in some file, and each block's title must include its testCaseId.
- Prefer one file per logical feature/page over one giant file; group related test cases together.
- Use realistic, traceable selectors and steps derived from the test case's steps/expectedResults; do not fabricate unrelated assertions.
- When a test case includes structured example values or test data, use those literal values in the generated code before inventing placeholder usernames, passwords, names, amounts, or labels.
- If no structured values are supplied for a field, leave a clear TODO-style placeholder rather than silently inventing business data.`;

const AUTOMATION_BATCH_SIZE = 2;

function uniquifySpecFilename(filename: string, seenFilenames: Set<string>): string {
  if (!seenFilenames.has(filename)) return filename;

  const specSuffix = '.spec.ts';
  const baseName = filename.endsWith(specSuffix) ? filename.slice(0, -specSuffix.length) : filename;
  let sequence = 2;
  let candidate = `${baseName}-${sequence}${specSuffix}`;
  while (seenFilenames.has(candidate)) {
    sequence += 1;
    candidate = `${baseName}-${sequence}${specSuffix}`;
  }
  return candidate;
}

/** Parses `code` as a TypeScript source file and throws if it contains syntax errors. */
function assertValidTypeScript(filename: string, code: string): void {
  const sourceFile = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const syntaxErrors = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (syntaxErrors.length > 0) {
    const message = syntaxErrors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ');
    throw new Error(`agent3Automation: generated file "${filename}" is not valid TypeScript: ${message}`);
  }
}

/** Agent 3: generates Playwright spec files automating the approved test cases via the configured LLM. */
export async function agent3Automation(state: OrchestratorStateType): Promise<OrchestratorStateUpdate> {
  if (!state.testCases.testCasesJsonPath) {
    throw new Error('agent3Automation: no approved testcases.json to consume');
  }

  const testCasesDoc = testCasesDocumentSchema.parse(
    JSON.parse(readRunArtifactByPath(state.testCases.testCasesJsonPath)),
  );
  if (testCasesDoc.testCases.length === 0) {
    throw new Error('agent3Automation: test cases document has no test cases to automate');
  }

  const revision = nextRevision(state.automation.revision);
  const latestFeedback = state.automation.hitlStatus === 'rejected'
    ? state.automation.regenerationHistory?.at(-1)
    : undefined;
  const priorAutomation = latestFeedback
    ? state.automation.generatedTestFiles
        .map((filePath) => `# ${filePath.split('/').pop() ?? filePath}\n${readRunArtifactByPath(filePath)}`)
        .join('\n\n')
    : undefined;

  const adapter = getLlmAdapter({
    llmProvider: state.config.llmProvider,
    llmModel: state.config.llmModel,
  });

  const batches = [];
  for (let index = 0; index < testCasesDoc.testCases.length; index += AUTOMATION_BATCH_SIZE) {
    batches.push(testCasesDoc.testCases.slice(index, index + AUTOMATION_BATCH_SIZE));
  }

  const generatedFiles = [];
  for (const [batchIndex, testCases] of batches.entries()) {
    const chat = await adapter.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `runId: ${state.runId}`,
            `batch: ${batchIndex + 1} of ${batches.length}`,
            '',
            `Approved test cases:\n${JSON.stringify(testCases, null, 2)}`,
            buildRegenerationPrompt('Automation', latestFeedback, priorAutomation),
          ]
            .filter((value): value is string => Boolean(value))
            .join('\n\n'),
        },
      ],
      { temperature: 0.2, maxTokens: 8_192, jsonMode: true },
    );

    const extracted = extractJson(chat.content) as
      | {
          files?: {
            filename?: string;
            fileName?: string;
            testCaseIds?: string[];
            testCaseId?: string;
            code?: string;
            codeLines?: string[];
          }[];
        }
      | {
          filename?: string;
          fileName?: string;
          testCaseIds?: string[];
          testCaseId?: string;
          code?: string;
          codeLines?: string[];
        }[];
    const rawDocument = Array.isArray(extracted)
      ? {
          files: extracted.map((file) => ({
            filename: file.filename ?? file.fileName,
            testCaseIds: file.testCaseIds ?? (file.testCaseId ? [file.testCaseId] : undefined),
            code: file.code,
            codeLines: file.codeLines,
          })),
        }
      : {
          ...extracted,
          files: (extracted.files ?? []).map((file) => ({
            filename: file.filename ?? file.fileName,
            testCaseIds: file.testCaseIds ?? (file.testCaseId ? [file.testCaseId] : undefined),
            code: file.code,
            codeLines: file.codeLines,
          })),
        };
    const doc: AutomationDocument = automationDocumentSchema.parse({
      ...rawDocument,
      files: (rawDocument.files ?? []).map((file) => ({
        ...file,
        code: file.code ?? file.codeLines?.join('\n') ?? '',
      })),
      runId: state.runId,
    });
    generatedFiles.push(...doc.files);
  }

  const doc: AutomationDocument = { runId: state.runId, files: generatedFiles };

  const seenFilenames = new Set<string>();
  const coveredTestCaseIds = new Set<string>();
  const normalizedFiles = doc.files.map((file) => {
    const filename = uniquifySpecFilename(file.filename, seenFilenames);
    seenFilenames.add(filename);
    assertValidTypeScript(filename, file.code);
    for (const testCaseId of file.testCaseIds) coveredTestCaseIds.add(testCaseId);
    return { ...file, filename };
  });

  const testCaseIds = new Set(testCasesDoc.testCases.map((tc) => tc.testCaseId));
  for (const testCaseId of coveredTestCaseIds) {
    if (!testCaseIds.has(testCaseId)) {
      throw new Error(`agent3Automation: generated file traces to unknown test case "${testCaseId}"`);
    }
  }
  for (const testCaseId of testCaseIds) {
    if (!coveredTestCaseIds.has(testCaseId)) {
      throw new Error(`agent3Automation: test case "${testCaseId}" is not automated by any generated file`);
    }
  }

  const normalizedDoc: AutomationDocument = { ...doc, files: normalizedFiles };

  const generatedTestFiles = normalizedDoc.files.map((file) =>
    writeRunArtifact(state.runId, 'tests', appendRevisionSuffix(file.filename, revision), file.code),
  );
  const manifestPath = writeRunArtifact(
    state.runId,
    'tests',
    appendRevisionSuffix('automation_manifest.json', revision),
    JSON.stringify(
      {
        ...normalizedDoc,
        files: normalizedDoc.files.map((file, index) => ({
          ...file,
          filename: appendRevisionSuffix(file.filename, revision),
          path: generatedTestFiles[index],
        })),
      },
      null,
      2,
    ),
  );

  if (state.config.enableHITLAutomation) {
    return {
      status: 'waiting_hitl',
      currentPhase: 'hitl_automation',
      automation: {
        generatedTestFiles,
        hitlStatus: 'pending',
        hitlComments: undefined,
        manifestPath,
        revision,
        regenerationHistory: state.automation.regenerationHistory ?? [],
      },
    };
  }

  return {
    status: 'running',
    currentPhase: 'execute_tests',
    automation: {
      generatedTestFiles,
      manifestPath,
      revision,
      regenerationHistory: state.automation.regenerationHistory ?? [],
    },
  };
}
