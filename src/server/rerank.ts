/**
 * Reranking & personality helpers (Claude)
 * - `analyzeScholarshipPersonality(raw)`: infer weights/themes/tone as JSON.
 * - `rerankWithClaude(studentSummary, candidates)`: setwise/listwise rerank with reasons.
 */
import { askClaude } from "./llm/anthropic";
import { coerceMinifiedJson, extractAnthropicText } from "./llm/json";

export type Personality = {
  weights: Record<string, number>; // e.g., academics, leadership, need, projects...
  themes: string[];
  tone: string;
  hard_constraints?: string[];
};

export async function analyzeScholarshipPersonality(raw: string): Promise<Personality> {
  /**
   * Infer a scholarship "personality" (weights/themes/tone) from raw description text via Claude.
   * @param raw Scholarship description text
   * @returns Parsed `Personality` JSON
   */
  const sys = `You infer hidden priorities from scholarship text.
Output strict JSON with keys: weights (object), themes (array of strings), tone (string), hard_constraints (array). Weights must sum approximately to 1.0.`;
  const res = await askClaude({
    system: sys,
    user: `SCHOLARSHIP TEXT:\n${raw}\n\nReturn JSON only.`,
    max_tokens: 800,
  })
  const text = extractAnthropicText(res)
  return coerceMinifiedJson(text)
}

export type Candidate = {
  id: string;
  name: string;
  snippet: string;     // short normalized desc used in prompt
  personality?: Personality;
};

export async function rerankWithClaude(
  studentSummary: string,
  candidates: Candidate[]
) {
  /**
   * Setwise/listwise reranker using Claude. Produces a global ordering with scores and rationales.
   * @param studentSummary Normalized student summary text
   * @param candidates Candidate scholarships (with optional personality)
   * @returns Array of `{ id, score, rationale }` in model-ranked order
   */
  const sys = `You are a ranking model. Given a student summary and a list of scholarships with priority weights, rank them from best to worst fit.
Return strict JSON: { ranking: [{id, score, rationale}] } with 0-100 scores.`;

  const list = candidates.map((c, i) => ({
    idx: i + 1,
    id: c.id,
    name: c.name,
    desc: c.snippet,
    weights: c.personality?.weights ?? {},
    themes: c.personality?.themes ?? [],
    tone: c.personality?.tone ?? "",
  }));

  const res = await askClaude({
    system: sys,
    user:
      `STUDENT:\n${studentSummary}\n\nCANDIDATES:\n` +
      JSON.stringify(list, null, 2) +
      `\n\nReturn JSON only.`,
    max_tokens: 2000,
  })

  const json = coerceMinifiedJson(extractAnthropicText(res)) as { ranking: { id: string; score: number; rationale: string }[] };
  return json.ranking;
}
