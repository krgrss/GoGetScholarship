import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'

const Candidate = z.object({
  id: z.string(),
  name: z.string(),
  snippet: z.string().optional().default(''),
  min_gpa: z.number().optional(),
  country: z.string().optional(),
  fields: z.array(z.string()).optional().default([]),
  weights_hint: z.record(z.string(), z.number()).optional().default({}),
})

const RerankIn = z.object({
  student_summary: z.string(),
  candidates: z.array(Candidate).min(1),
  top_k: z.number().int().min(1).max(50).optional().default(20),
})

const RerankOut = z.object({
  ranking: z
    .array(
      z.object({
        id: z.string(),
        score: z.number().min(0).max(100),
        rationale: z.string(),
      }),
    )
    .min(1),
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

export const Route = createFileRoute('/api/rerank')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = RerankIn.parse(await request.json())

        const system =
          'You are a setwise reranker inspired by Rank-R1. ' +
          'Rank ALL candidates globally using pairwise and listwise reasoning. ' +
          'Output ONLY minified JSON that matches the schema.'

        const user = `
Student summary:
${input.student_summary}

Candidates (JSON):
${JSON.stringify(input.candidates)}

Return EXACTLY:
{
  "ranking": [
    { "id": "ID_FROM_INPUT", "score": 0-100, "rationale": "1-2 sentences" }
  ]
}
Constraints:
- Include every candidate id exactly once.
- "score" is a global relevance score in [0,100], not probabilities.
- Keep rationales short and reference concrete alignments (GPA, projects, fields, themes).
`.trim()

        const res = await askClaude({
          system,
          user,
          max_tokens: 1200,
        })

        try {
          const json = RerankOut.parse(coerceJson(extractText(res)))
          // Optionally slice to top_k (but keep original order from model)
          const top = json.ranking
            .slice(0, input.top_k)
            .map((r) => ({ ...r, score: Math.round(r.score) }))
          return new Response(JSON.stringify({ ok: true, ranking: top }), {
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
