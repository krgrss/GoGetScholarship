import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'

const Personality = z.object({
  weights: z.record(z.string(), z.number()),
  themes: z.array(z.string()),
  tone: z.string(),
  constraints: z.array(z.string()).optional().default([]),
  notes: z.array(z.string()).optional().default([]),
})

const DraftIn = z.object({
  scholarship_name: z.string(),
  scholarship_text: z.string().optional().default(''),
  personality: Personality, // output from /api/personality
  student_profile: z.object({
    name: z.string().optional(),
    gpa: z.number().optional(),
    major: z.string().optional(),
    country: z.string().optional(),
    activities: z.array(z.string()).optional().default([]),
    awards: z.array(z.string()).optional().default([]),
    projects: z.array(z.string()).optional().default([]),
    background: z.array(z.string()).optional().default([]), // e.g., first-gen, immigrant, etc.
    stories: z.array(z.string()).optional().default([]),
  }),
  word_target: z.number().int().min(150).max(800).optional().default(350),
  style: z.string().optional(), // override tone if you want
})

const DraftOut = z.object({
  draft: z.string(),
  explanation: z.string(),
  outline: z.array(z.string()).optional().default([]),
  safety: z.object({
    used_only_provided_facts: z.boolean(),
    missing_info_flags: z.array(z.string()),
  }),
})

function extractText(res: any): string {
  const t = (res?.content?.[0] as any)?.text
  return typeof t === 'string' ? t : JSON.stringify(res?.content ?? {})
}

function coerceJson(s: string) {
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  return JSON.parse(s)
}

export const Route = createFileRoute('/api/draft')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = DraftIn.parse(await request.json())

        const system =
          'You are an assistant that drafts scholarship application essays ' +
          'AUTHENTICALLY. Do NOT fabricate achievements. Use only provided facts. ' +
          'Output ONLY valid minified JSON matching the schema.'

        const weightPairs = Object.entries(input.personality.weights)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')

        const user = `
Scholarship: ${input.scholarship_name}
Scholarship text (optional): ${input.scholarship_text.slice(0, 4000)}

Personality:
- Weights: ${weightPairs}
- Themes: ${input.personality.themes.join(', ')}
- Tone: ${input.style ?? input.personality.tone}
- Constraints: ${(input.personality.constraints ?? []).join('; ')}

Student profile (facts only):
${JSON.stringify(input.student_profile, null, 2)}

Target words: ~${input.word_target}

Return EXACTLY this JSON:
{
  "draft": "essay text",
  "explanation": "why this aligns with weights/themes; call out 2-3 concrete alignments",
  "outline": ["intro ...", "body a ...", "body b ...", "close ..."],
  "safety": {
    "used_only_provided_facts": true,
    "missing_info_flags": []
  }
}

Rules:
- Lead with the strongest signals implied by weights (e.g., GPA/projects if high).
- Reframe the SAME stories differently if tone/themes suggest it.
- Respect constraints (e.g., min GPA, country) and flag mismatches in missing_info_flags.
- No bullet spam in the draft; write in paragraphs.
`.trim()

        const res = await askClaude({
          system,
          user,
          max_tokens: 1600,
        })

        try {
          const json = DraftOut.parse(coerceJson(extractText(res)))
          return new Response(JSON.stringify({ ok: true, ...json }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
