import type { JeveDecision } from '@qa-agent/shared';
import { resolveJevConfig } from './config.js';
import { loadJevEnv } from './env.js';
import { normalizeInput } from './normalize.js';
import { evaluateViaTypesafe } from './typesafeClient.js';
import { structureOk } from './checks/structure.js';
import { noPiiSecrets } from './checks/pii.js';
import { contentQuality } from './checks/quality.js';
import { testableRequirement } from './checks/testability.js';
import type {
  EvaluateInputFile,
  EvaluateInputParams,
  EvaluateInputResult,
  JevCheckFn,
  JevCheckName,
  JevOutcome,
  JevThresholds,
} from './types.js';

const CHECK_FNS: Record<JevCheckName, JevCheckFn> = {
  structure_ok: structureOk,
  no_pii_secrets: noPiiSecrets,
  content_quality: contentQuality,
  testable_requirement: testableRequirement,
};

function outcomeFor(probability: number, thresholds: JevThresholds): JevOutcome {
  if (probability >= thresholds.accept) return 'accept';
  if (probability >= thresholds.flag) return 'flag';
  return 'reject';
}

/**
 * Pre-LLM calibrated gating: runs enabled RLCD-style checks and returns a JEV decision.
 * Uses TypeSafe AI's `jev-latest` model (https://docs.typesafe.ai/api) when `TYPESAFE_API_KEY`
 * is configured; falls back to local heuristic checks otherwise (e.g. for offline/dev use).
 */
export async function evaluateInput(params: EvaluateInputParams): Promise<EvaluateInputResult> {
  const rawText = params.rawText ?? '';
  const files: EvaluateInputFile[] = params.files ?? [];
  const env = loadJevEnv();
  const config = resolveJevConfig(env, params.config);

  const probabilityByCheck = env.TYPESAFE_API_KEY
    ? await evaluateViaTypesafe(normalizeInput(rawText) || rawText, config.enabledChecks, {
        apiKey: env.TYPESAFE_API_KEY,
        baseUrl: env.TYPESAFE_API_BASE_URL,
        model: env.TYPESAFE_MODEL,
      })
    : Object.fromEntries(
        config.enabledChecks.map((name) => [name, CHECK_FNS[name](rawText, files)]),
      ) as Record<JevCheckName, number>;

  const decisions: JeveDecision[] = config.enabledChecks.map((name) => {
    const probability = probabilityByCheck[name];
    return {
      name,
      probability,
      outcome: outcomeFor(probability, config.thresholds),
    };
  });

  const probabilities = Object.fromEntries(
    decisions.map((decision) => [decision.name, decision.probability]),
  ) as Record<JevCheckName, number>;

  const rejected = decisions.filter((d) => d.outcome === 'reject');
  const valid = rejected.length === 0;

  const result: EvaluateInputResult = {
    valid,
    decisions,
    probabilities,
    normalizedInput: normalizeInput(rawText),
  };

  if (rejected.length > 0) {
    result.errors = rejected.map((d) => `${d.name} failed (probability ${d.probability.toFixed(2)})`);
  }

  return result;
}

export * from './types.js';
export * from './config.js';
export * from './env.js';
export * from './normalize.js';
export * from './typesafeClient.js';
export { structureOk } from './checks/structure.js';
export { noPiiSecrets } from './checks/pii.js';
export { contentQuality } from './checks/quality.js';
export { testableRequirement } from './checks/testability.js';
