/**
 * Essay drafting helper (Claude)
 * - `generateTailoredDraft`: produces essay JSON (draft, explanation) using only provided student stories
 *   and the scholarship personality. Never fabricates facts.
 */
import { askClaude } from "./llm/anthropic";
import { coerceMinifiedJson, extractAnthropicText } from "./llm/json";
import { Personality } from "./rerank";

export async function generateTailoredDraft(opts: {
  scholarshipName: string;
  scholarshipPersonality: Personality;
  studentStories: string[];   // real achievements only
  wordTarget?: number;        // e.g., 400
}) {
  /**
   * Generate an essay draft JSON (draft + explanation) tailored to a scholarship personality
   * using ONLY the provided student stories.
   * @param opts.scholarshipName Scholarship display name
   * @param opts.scholarshipPersonality Personality weights/themes/tone
   * @param opts.studentStories Array of fact-checked student stories
   * @param opts.wordTarget Target word count (default 400)
   */
  const { scholarshipName, scholarshipPersonality, studentStories, wordTarget = 400 } = opts;

  const sys = `Write an authentic scholarship application draft.
- Use ONLY provided student stories (no fabrication).
- Align with given weights/themes/tone.
- Output JSON: { draft: string, explanation: string }`;

  const res = await askClaude({
    system: sys,
    user:
      `SCHOLARSHIP: ${scholarshipName}\n` +
      `PERSONALITY:\n${JSON.stringify(scholarshipPersonality, null, 2)}\n\n` +
      `STUDENT_STORIES:\n${studentStories.map((s, i) => `- (${i + 1}) ${s}`).join("\n")}\n\n` +
      `TARGET_WORDS: ${wordTarget}\n` +
      `Return JSON only.`,
    max_tokens: 2000,
  })

  const text = extractAnthropicText(res)
  return coerceMinifiedJson(text) as { draft: string; explanation: string }
}
