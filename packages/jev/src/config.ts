import type { JevConfig } from './types.js';
import type { JevEnv } from './env.js';

export const DEFAULT_JEV_CONFIG: JevConfig = {
  enabledChecks: ['structure_ok', 'no_pii_secrets', 'content_quality', 'testable_requirement'],
  thresholds: {
    accept: 0.8,
    flag: 0.5,
  },
};

/** Merges the default JEV config with `.env` threshold overrides and an optional per-call override. */
export function resolveJevConfig(env: JevEnv, override?: Partial<JevConfig>): JevConfig {
  return {
    enabledChecks: override?.enabledChecks ?? DEFAULT_JEV_CONFIG.enabledChecks,
    thresholds: {
      accept: override?.thresholds?.accept ?? env.JEV_ACCEPT_THRESHOLD,
      flag: override?.thresholds?.flag ?? env.JEV_FLAG_THRESHOLD,
    },
  };
}
