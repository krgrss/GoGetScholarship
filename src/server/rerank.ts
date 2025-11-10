// src/server/rerank.ts (part 1)
import { anthropic } from "./llm/anthropic";

export type Personality = {
  weights: Record<string, number>; // e.g., academics, leadership, need, projects...
  themes: string[];
  tone: string;
  hard_constraints?: string[];
};

export async function analyzeScholarshipPersonality(raw: string): Promise<Personality> {
  const sys = `You infer hidden priorities from scholarship text.
Output strict JSON with keys: weights (object), themes (array of strings), tone (string), hard_constraints (array). Weights must sum approximately to 1.0.`;
  const res = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    system: sys,
    max_tokens: 800,
    messages: [
      { role: "user", content: `SCHOLARSHIP TEXT:\n${raw}\n\nReturn JSON only.` },
    ],
  });
  const text = (res.content[0] as any).text.trim();
  return JSON.parse(text);
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

  const res = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    system: sys,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content:
          `STUDENT:\n${studentSummary}\n\nCANDIDATES:\n` +
          JSON.stringify(list, null, 2) +
          `\n\nReturn JSON only.`,
      },
    ],
  });

  const json = JSON.parse((res.content[0] as any).text);
  return json.ranking as { id: string; score: number; rationale: string }[];
}
