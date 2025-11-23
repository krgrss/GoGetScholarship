/**
 * POST /api/rerank
 * Purpose: Setwise/listwise LLM reranking of candidate scholarships for a student.
 * Auth: Public. Consider adding a rate limit if exposed broadly.
 *
 * Input schema (RerankIn):
 *   { student_summary: string, candidates: [{ id, name, snippet?, min_gpa?, country?, fields?, weights_hint? }], top_k? }
 * Output schema (RerankOut):
 *   { ranking: [{ id, score (0..100), rationale }] }
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { cacheGet, cacheSet } from '@/server/cache'
import { recordTelemetry } from '@/server/telemetry'

/**
 * Zod schema: Candidate scholarship summary for reranking
 */
const Candidate = z.object({
  id: z.string(),
  name: z.string(),
  snippet: z.string().optional().default(''),
  min_gpa: z.number().optional(),
  country: z.string().optional(),
  fields: z.array(z.string()).optional().default([]),
  weights_hint: z.record(z.string(), z.number()).optional().default({}),
})

/**
 * Zod schema: Rerank request payload
 */
const RerankIn = z.object({
  student_summary: z.string(),
  candidates: z.array(Candidate).min(1),
  top_k: z.number().int().min(1).max(50).optional().default(20),
})

/**
 * Zod schema: Rerank response payload
 */
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

// centralized helpers

export const Route = createFileRoute('/api/rerank')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = RerankIn.parse(await request.json())

        const cacheKey = JSON.stringify({
          kind: 'rerank-api',
          student_summary: input.student_summary,
          candidates: input.candidates,
          top_k: input.top_k,
          version: 1,
        })

        const cached = cacheGet<{ ranking: { id: string; score: number; rationale: string }[] }>(cacheKey)
        if (cached) {
          return new Response(JSON.stringify({ ok: true, ranking: cached.ranking }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const system =
          'You are a setwise scholarship reranker. ' +
          'Rank ALL candidates globally and output ONLY minified JSON that matches the schema.'

        const user = `
Student summary:
${input.student_summary}

Candidates (JSON, minified):
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
- Keep rationales very short; reference concrete alignments (GPA, projects, fields, themes).
`.trim()

        const started = Date.now()
        const res = await askClaude({
          system,
          user,
          max_tokens: 600,
        })
        const durationMs = Date.now() - started

        try {
          const json = RerankOut.parse(coerceMinifiedJson(extractAnthropicText(res)))
          const top = json.ranking
            .slice(0, input.top_k)
            .map((r) => ({ ...r, score: Math.round(r.score) }))

          cacheSet(cacheKey, { ranking: top }, 24 * 60 * 60 * 1000)
          recordTelemetry({ step: 'rerank', ok: true, durationMs, meta: { count: top.length } })

          return new Response(JSON.stringify({ ok: true, ranking: top }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          recordTelemetry({ step: 'rerank', ok: false, durationMs, error: String(e) })
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
