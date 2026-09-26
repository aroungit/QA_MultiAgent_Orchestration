import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateInput } from '../index.js';
import { resetJevEnvCache } from '../env.js';

const GOOD_REQUIREMENT =
  'When the user submits a valid login form, the system should authenticate the user and ' +
  'display a welcome message on the dashboard. The response must return within 2 seconds, ' +
  'and invalid credentials should be rejected with a clear error message.';

afterEach(() => {
  resetJevEnvCache();
  delete process.env.JEV_ACCEPT_THRESHOLD;
  delete process.env.JEV_FLAG_THRESHOLD;
  process.env.TYPESAFE_API_KEY = '';
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // A real TYPESAFE_API_KEY in the dev .env must not leak into tests that don't opt into it
  // (those explicitly set it themselves) — otherwise they'd make live network calls. Setting
  // it to '' (not deleting) stops dotenv.config() from re-reading the real value off disk,
  // since dotenv only fills in vars that are entirely absent from process.env.
  process.env.TYPESAFE_API_KEY = '';
  resetJevEnvCache();
});

describe('evaluateInput', () => {
  it('accepts a well-structured, testable requirement with no PII', async () => {
    const result = await evaluateInput({ rawText: GOOD_REQUIREMENT });

    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.decisions).toHaveLength(4);
    for (const decision of result.decisions) {
      expect(decision.outcome).not.toBe('reject');
    }
  });

  it('rejects empty input', async () => {
    const result = await evaluateInput({ rawText: '' });

    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('flags or rejects input containing placeholder text', async () => {
    const result = await evaluateInput({
      rawText: 'TODO: fill this in later. Lorem ipsum dolor sit amet, placeholder content here.',
    });

    const qualityDecision = result.decisions.find((d) => d.name === 'content_quality');
    expect(qualityDecision).toBeDefined();
    expect(qualityDecision?.outcome).not.toBe('accept');
  });

  it('rejects input containing an obvious secret/API key', async () => {
    const result = await evaluateInput({
      rawText: `${GOOD_REQUIREMENT}\napi_key: sk-abcdefghijklmnopqrstuvwxyz123456`,
    });

    const piiDecision = result.decisions.find((d) => d.name === 'no_pii_secrets');
    expect(piiDecision?.outcome).toBe('reject');
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.includes('no_pii_secrets'))).toBe(true);
  });

  it('flags input containing an email address without hard-rejecting the whole input', async () => {
    const result = await evaluateInput({
      rawText: `${GOOD_REQUIREMENT} Contact jane.doe@example.com for questions.`,
    });

    const piiDecision = result.decisions.find((d) => d.name === 'no_pii_secrets');
    expect(piiDecision?.outcome).toBe('flag');
  });

  it('honors custom threshold overrides via config param', async () => {
    const strict = await evaluateInput({
      rawText: GOOD_REQUIREMENT,
      config: { thresholds: { accept: 0.99, flag: 0.98 } },
    });

    expect(strict.decisions.some((d) => d.outcome !== 'accept')).toBe(true);
  });

  it('normalizes the raw text (trims, collapses blank lines)', async () => {
    const result = await evaluateInput({ rawText: '\uFEFF  hello world  \r\n\n\n\nmore text  ' });
    expect(result.normalizedInput).toBe('hello world\n\nmore text');
  });

  it('uses TypeSafe AI when TYPESAFE_API_KEY is set, sending one batched request', async () => {
    process.env.TYPESAFE_API_KEY = 'test-typesafe-key';
    resetJevEnvCache();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'jev-1.13.0',
        answers: {
          structure_ok: { type: 'noul', noul: 0.9 },
          no_pii_secrets: { type: 'noul', noul: 0.95 },
          content_quality: { type: 'noul', noul: 0.85 },
          testable_requirement: { type: 'noul', noul: 0.92 },
        },
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await evaluateInput({ rawText: GOOD_REQUIREMENT });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(init.headers.Authorization).toBe('Bearer test-typesafe-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('jev-latest');
    expect(Object.keys(body.questions)).toHaveLength(4);

    expect(result.valid).toBe(true);
    expect(result.probabilities.structure_ok).toBe(0.9);
  });

  it('propagates TypeSafe AI errors instead of silently falling back to heuristics', async () => {
    process.env.TYPESAFE_API_KEY = 'test-typesafe-key';
    resetJevEnvCache();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid key' }),
    );

    await expect(evaluateInput({ rawText: GOOD_REQUIREMENT })).rejects.toThrow(
      /TypeSafe AI evaluation failed \(401\)/,
    );
  });
});
