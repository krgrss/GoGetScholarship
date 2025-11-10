import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'

const PersonalityOut = z.object({
  weights: z.object({
    gpa: z.number().min(0).max(1),
    projects: z.number().min(0).max(1),
    leadership: z.number().min(0).max(1),
    community: z.number().min(0).max(1),
    need: z.number().min(0).max(1),
    background: z.number().min(0).max(1),
    research: z.number().min(0).max(1).optional().default(0),
    innovation: z.number().min(0).max(1).optional().default(0),
    extracurriculars: z.number().min(0).max(1).optional().default(0),
  }).strict(),
  themes: z.array(z.string()).max(8),
  tone: z.string(),
  constraints: z.array(z.string()).optional().default([]),
  notes: z.array(z.string()).optional().default([]),
})

type PersonalityIn = {
  scholarship_name?: string
  raw_text: string
  winner_texts?: string[]
}

function extractText(res: any): string {
  const t = (res?.content?.[0] as any)?.text
  return typeof t === 'string' ? t : JSON.stringify(res?.content ?? {})
}

function coerceJson(s: string) {
  // tolerate fenced code blocks or extra prose
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  return JSON.parse(s)
}

export const Route = createFileRoute('/api/personality')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as PersonalityIn

        const system =
          'You are an expert reviewer of scholarship descriptions. ' +
          'Output only valid minified JSON matching the schema.'

        const user = `
Return EXACTLY this JSON (no prose), filling values realistically and making sure weights sum to 1.0:

{
  "weights": {
    "gpa": 0,
    "projects": 0,
    "leadership": 0,
    "community": 0,
    "need": 0,
    "background": 0,
    "research": 0,
    "innovation": 0,
    "extracurriculars": 0
  },
  "themes": [],
  "tone": "",
  "constraints": [],
  "notes": []
}

Consider the scholarship text and any winner stories:
--- SCHOLARSHIP (${body.scholarship_name ?? 'unknown'}) ---
${body.raw_text}

--- WINNER STORIES (optional) ---
${(body.winner_texts ?? []).join('\n\n---\n')}
`.trim()

        const res = await askClaude({
          system,
          user,
          max_tokens: 1200,
        })

        try {
          const txt = extractText(res)
          const json = PersonalityOut.parse(coerceJson(txt))

          // normalize weights to sum to 1 (safety)
          const entries = Object.entries(json.weights) as [string, number][]
          const sum = entries.reduce((a, [, v]) => a + v, 0) || 1
          const norm = Object.fromEntries(
            entries.map(([k, v]) => [k, Number((v / sum).toFixed(4))]),
          )
          const out = { ...json, weights: norm }

          return new Response(JSON.stringify({ ok: true, personality: out }), {
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
