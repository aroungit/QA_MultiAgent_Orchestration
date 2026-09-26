import type { ExecutionSummary, HitlPhase, JeveDecision, Phase, RunConfig, RunStatus } from '@qa-agent/shared';

export type HitlDecisionValue = 'approved' | 'rejected';

export interface RunRecord {
  id: string;
  status: RunStatus;
  currentPhase: Phase | null;
  config: RunConfig;
  executionSummary: ExecutionSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunInputRecord {
  id: string;
  runId: string;
  rawText: string | null;
  createdAt: string;
}

export interface RunFileRecord {
  id: string;
  runId: string;
  name: string;
  path: string;
  type: string;
  phase: Phase | null;
  createdAt: string;
}

export interface HitlDecisionRecord {
  id: string;
  runId: string;
  phase: HitlPhase;
  decision: HitlDecisionValue;
  comments: string | null;
  decidedAt: string;
}

export interface JeveResultRecord {
  id: string;
  runId: string;
  valid: boolean;
  decisions: JeveDecision[] | null;
  errors: unknown[] | null;
  normalizedInput: unknown | null;
  createdAt: string;
}
