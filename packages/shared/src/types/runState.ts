export type RunStatus =
  | 'created'
  | 'running'
  | 'waiting_hitl'
  | 'completed'
  | 'failed'
  | 'rejected';

export type Phase =
  | 'ingest_input'
  | 'jeve_validate'
  | 'agent1_requirements'
  | 'hitl_requirements'
  | 'agent2_testcases'
  | 'hitl_testcases'
  | 'agent3_automation'
  | 'hitl_automation'
  | 'execute_tests'
  | 'finalize_run';

export type LlmProvider = 'groq' | 'cohere' | 'openrouter';
export type EmbeddingsProvider = 'voyage' | 'jina' | 'mistral';
export type ExecutionBackend = 'local' | 'docker';
export type ProjectRole = 'owner' | 'editor' | 'viewer';

export type HitlPhase = 'hitl_requirements' | 'hitl_testcases' | 'hitl_automation';

export type HitlStatus = 'pending' | 'approved' | 'rejected';

export interface RegenerationHistoryEntry {
  iteration: number;
  comments: string;
  artifactPaths: string[];
}

export interface RunFileRef {
  name: string;
  path: string;
  type: string;
}

export interface RunConfig {
  llmProvider: LlmProvider;
  llmModel: string;
  embeddingsProvider: EmbeddingsProvider;
  embeddingsModel: string;
  enableHITLAutomation: boolean;
  executionBackend?: ExecutionBackend;
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  ownerUserId: string;
  defaultConfig: RunConfig;
  membershipRole: ProjectRole;
  createdAt: string;
  updatedAt: string;
}

export interface JeveDecision {
  name: 'structure_ok' | 'no_pii_secrets' | 'content_quality' | 'testable_requirement';
  probability: number;
  outcome: 'accept' | 'flag' | 'reject';
}

export interface JeveResultState {
  valid: boolean;
  decisions?: JeveDecision[];
  errors?: unknown[];
  normalizedInput?: unknown;
}

export interface RequirementsState {
  summaryMarkdownPath?: string;
  requirementsJsonPath?: string;
  hitlStatus?: HitlStatus;
  hitlComments?: string;
  revision?: number;
  regenerationHistory?: RegenerationHistoryEntry[];
}

export interface TestCasesState {
  summaryMarkdownPath?: string;
  testCasesJsonPath?: string;
  hitlStatus?: HitlStatus;
  hitlComments?: string;
  revision?: number;
  regenerationHistory?: RegenerationHistoryEntry[];
}

export interface AutomationState {
  generatedTestFiles: string[];
  hitlStatus?: HitlStatus;
  hitlComments?: string;
  revision?: number;
  regenerationHistory?: RegenerationHistoryEntry[];
}

export interface ExecutionSummary {
  total: number;
  passed: number;
  failed: number;
}

export interface ExecutionState {
  reportHtmlPath?: string;
  reportJsonPath?: string;
  reportJunitPath?: string;
  reportAllurePath?: string;
  summary?: ExecutionSummary;
}

export interface RunState {
  runId: string;
  status: RunStatus;
  currentPhase: Phase | null;

  input: {
    rawText?: string;
    files: RunFileRef[];
  };

  jeve: JeveResultState;
  requirements: RequirementsState;
  testCases: TestCasesState;
  automation: AutomationState;
  execution: ExecutionState;
  config: RunConfig;
}
