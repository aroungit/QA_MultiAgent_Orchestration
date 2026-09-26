/** Payload surfaced to a paused-graph caller (e.g. API layer) describing what needs review. */
export interface HitlInterruptPayload {
  phase: 'hitl_requirements' | 'hitl_testcases' | 'hitl_automation';
  runId: string;
  artifacts: Record<string, string | undefined>;
}

/** Resume value supplied via `Command({ resume })` when a HITL gate is approved/rejected. */
export interface HitlResumeValue {
  decision: 'approved' | 'rejected';
  comments?: string;
}
