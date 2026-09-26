import { jsonrepair } from 'jsonrepair';

/** Pulls the first top-level JSON value out of an LLM response, tolerating markdown code fences. */
export function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const objectStart = candidate.indexOf('{');
  const arrayStart = candidate.indexOf('[');
  const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
  const end = candidate[start] === '[' ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('extractJson: LLM response did not contain a JSON value');
  }
  const json = candidate.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch {
    return JSON.parse(jsonrepair(json));
  }
}
