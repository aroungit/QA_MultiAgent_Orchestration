import type {
  AutomationDocument,
  ExecutionState,
  ExecutionSummary,
  HitlPhase,
  JeveResultState,
  Phase,
  RequirementsDocument,
  RequirementsState,
  RunConfig,
  RunFileRef,
  RunStatus,
  TestCasesDocument,
  TestCasesState,
} from '@qa-agent/shared';

// NEXT_PUBLIC_API_URL is inlined by Next.js at build time, so this works both server- and client-side.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface RunSummary {
  id: string;
  status: RunStatus;
  currentPhase: Phase | null;
  config: RunConfig;
  executionSummary: ExecutionSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrendPoint {
  runId: string;
  createdAt: string;
  summary: ExecutionSummary;
}

export interface RunDetailResponse {
  runId: string;
  status: RunStatus;
  currentPhase: Phase | null;
  config: RunConfig;
  executionSummary: ExecutionSummary | null;
  createdAt: string;
  updatedAt: string;
  input?: { rawText?: string; files: RunFileRef[] };
  jeve?: JeveResultState;
  requirements?: RequirementsState;
  testCases?: TestCasesState;
  automation?: { generatedTestFiles: string[]; hitlStatus?: string; hitlComments?: string };
  execution?: ExecutionState;
  hitlDecisions: { id: string; phase: HitlPhase; decision: 'approved' | 'rejected'; comments: string | null; decidedAt: string }[];
  files: { id: string; name: string; path: string; type: string; phase: Phase | null; createdAt: string }[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init });
  if (!res.ok) {
    const details = await res.json().catch(() => undefined);
    throw new ApiError(res.status, `API request failed: ${init?.method ?? 'GET'} ${path} (${res.status})`, details);
  }
  return res.json() as Promise<T>;
}

export function listRuns(): Promise<RunSummary[]> {
  return apiFetch<RunSummary[]>('/runs');
}

export function getRun(runId: string): Promise<RunDetailResponse> {
  return apiFetch<RunDetailResponse>(`/runs/${runId}`);
}

export interface CreateRunInput {
  rawText: string;
  config: Partial<RunConfig>;
  files: File[];
}

export async function createRun(input: CreateRunInput): Promise<RunDetailResponse> {
  const formData = new FormData();
  formData.append('rawText', input.rawText);
  formData.append('config', JSON.stringify(input.config));
  for (const file of input.files) {
    formData.append('files', file, file.name);
  }
  return apiFetch<RunDetailResponse>('/runs', { method: 'POST', body: formData });
}

export function submitHitlDecision(
  runId: string,
  phase: HitlPhase,
  decision: 'approved' | 'rejected',
  comments?: string,
): Promise<RunDetailResponse> {
  return apiFetch<RunDetailResponse>(`/runs/${runId}/hitl/${phase}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, comments }),
  });
}

export function artifactUrl(runId: string, type: string, fileName?: string): string {
  const base = `${API_URL}/runs/${runId}/artifacts/${type}`;
  return fileName ? `${base}?name=${encodeURIComponent(fileName)}` : base;
}

export function getTrends(): Promise<TrendPoint[]> {
  return apiFetch<TrendPoint[]>('/trends');
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'UTC',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short',
  timeZone: 'UTC',
});

export function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

export function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

export type { AutomationDocument, RequirementsDocument, TestCasesDocument };
