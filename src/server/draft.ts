// src/server/draft.ts
import { anthropic } from "./llm/anthropic";
import { Personality } from "./rerank";

export async function generateTailoredDraft(opts: {
  scholarshipName: string;
  scholarshipPersonality: Personality;
  studentStories: string[];   // real achievements only
  wordTarget?: number;        // e.g., 400
}) {
  const { scholarshipName, scholarshipPersonality, studentStories, wordTarget = 400 } = opts;

  const sys = `Write an authentic scholarship application draft.
- Use ONLY provided student stories (no fabrication).
- Align with given weights/themes/tone.
- Output JSON: { draft: string, explanation: string }`;

  const res = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    system: sys,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content:
`SCHOLARSHIP: ${scholarshipName}
PERSONALITY:
${JSON.stringify(scholarshipPersonality, null, 2)}

STUDENT_STORIES:
${studentStories.map((s, i) => `- (${i+1}) ${s}`).join("\n")}

TARGET_WORDS: ${wordTarget}
Return JSON only.`,
      },
    ],
  });

  const text = (res.content[0] as any).text;
  return JSON.parse(text) as { draft: string; explanation: string };
}
