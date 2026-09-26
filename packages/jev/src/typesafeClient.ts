import type { JevCheckName } from './types.js';

export interface TypesafeEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: { true?: string; false?: string };
}

interface TypesafeResponse {
  model: string;
  answers: Record<string, { type: 'noul'; noul: number }>;
  usage: { input_tokens: number; output_tokens: number };
}

/** One `noul` (yes/no probability) question per JEV decision, per https://docs.typesafe.ai/api. */
const QUESTION_DEFINITIONS: Record<JevCheckName, NoulQuestion> = {
  structure_ok: {
    type: 'noul',
    instructions:
      'Does this input have a clear, well-structured format resembling a software requirement ' +
      'or requirements document, with identifiable sections or statements, rather than disorganized ' +
      'fragments or noise?',
  },
  no_pii_secrets: {
    type: 'noul',
    instructions:
      'Does this input contain NO personally identifiable information (PII) and NO secrets or ' +
      'credentials such as API keys, passwords, or tokens?',
    criteria: {
      true: 'No PII or secrets/credentials are present.',
      false: 'PII (e.g. email, phone number, SSN) or a secret/credential is present.',
    },
  },
  content_quality: {
    type: 'noul',
    instructions:
      'Is this input sufficiently detailed and free of placeholder or filler text (e.g. "TODO", ' +
      '"lorem ipsum"), representing genuine, complete content?',
  },
  testable_requirement: {
    type: 'noul',
    instructions:
      'Does this input describe a requirement with a clear, verifiable expected behavior or ' +
      'outcome that could be validated by a test?',
  },
};

/** Calls TypeSafe AI's JEV evaluation endpoint for the given checks in a single batched request. */
export async function evaluateViaTypesafe(
  state: string,
  checks: JevCheckName[],
  env: TypesafeEnv,
): Promise<Record<JevCheckName, number>> {
  const questions: Record<string, NoulQuestion> = {};
  for (const check of checks) {
    questions[check] = QUESTION_DEFINITIONS[check];
  }

  const response = await fetch(env.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state, model: env.model, questions }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`TypeSafe AI evaluation failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TypesafeResponse;

  const result = {} as Record<JevCheckName, number>;
  for (const check of checks) {
    const answer = data.answers[check];
    if (!answer || answer.type !== 'noul' || typeof answer.noul !== 'number') {
      throw new Error(`TypeSafe AI response missing a valid "noul" answer for "${check}"`);
    }
    result[check] = answer.noul;
  }
  return result;
}
