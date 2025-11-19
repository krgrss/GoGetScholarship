/**
 * POST /api/grade-essay
 * Purpose: Grade an essay against a rubric using Claude (RubricCoach grade phase).
 * Auth: Requires ADMIN_API_KEY. Rate limited to 10/min.
 *
 * Payload (zod-validated):
 * {
 *   text: string,
 *   rubric: { id: string; name: string; description?: string; weight?: number }[]
 * }
 *
 * Response on success:
 * {
 *   ok: true,
 *   result: {
 *     criteria: [{ id, name, score, max, feedback }],
 *     overall_comment: string,
 *     readiness: "needs_work" | "solid" | "ready"
 *   }
 * }
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { ENV } from '@/server/env'
import { checkAdminKey } from '@/server/auth'
import { rateLimit } from '@/server/rateLimit'
import { cacheGet, cacheSet } from '@/server/cache'
import { recordTelemetry } from '@/server/telemetry'

const RubricItem = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  weight: z.number().optional(),
})

const GradeIn = z.object({
  text: z.string().min(1).max(20_000),
  rubric: z.array(RubricItem).min(1),
})

const GradeOut = z.object({
  criteria: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      score: z.number().min(0),
      max: z.number().min(1),
      feedback: z.string(),
    }),
  ),
  overall_comment: z.string(),
  readiness: z.enum(['needs_work', 'solid', 'ready']),
})

export const Route = createFileRoute('/api/grade-essay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = checkAdminKey(request, ENV.ADMIN_API_KEY)
        if (!auth.ok) return auth.res

        const rl = rateLimit(request, 'api:grade-essay', { windowMs: 60_000, max: 10 })
        if (!rl.ok) return rl.res

        const started = Date.now()

        let input: z.infer<typeof GradeIn>
        try {
          input = GradeIn.parse(await request.json())
        } catch (e: any) {
          recordTelemetry({
            step: 'grade',
            ok: false,
            durationMs: Date.now() - started,
            error: String(e),
          })
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const cacheKey = JSON.stringify({
          kind: 'grade-essay',
          text: input.text.slice(0, 2000),
          rubric: input.rubric,
          version: 1,
        })

        const cached = cacheGet<z.infer<typeof GradeOut>>(cacheKey)
        if (cached) {
          recordTelemetry({
            step: 'grade',
            ok: true,
            durationMs: Date.now() - started,
            meta: { cacheHit: true },
          })
          return new Response(JSON.stringify({ ok: true, result: cached }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const rubricJson = JSON.stringify(input.rubric, null, 2)

        const system =
          'You are a rubric grading assistant for scholarship essays.\n' +
          '- You MUST ONLY use the rubric criteria provided.\n' +
          '- Do NOT invent new criteria or change weights.\n' +
          '- Be fair but honest; scores should reflect the text.\n' +
          'Output ONLY minified JSON matching the schema.'

        const user = `
Return EXACTLY this JSON (no prose, no markdown):
{
  "criteria": [
    { "id": "criterion_id", "name": "Criterion name", "score": 0, "max": 5, "feedback": "short feedback" }
  ],
  "overall_comment": "overall feedback",
  "readiness": "needs_work" | "solid" | "ready"
}

Rules:
- Use ONLY the criteria listed in the rubric below.
- Score each criterion on a 0..5 scale (5 = excellent fit, 0 = does not address this at all).
- Feedback should be 1-2 sentences, specific and actionable.
- Readiness:
  - "needs_work" if several criteria are weak (scores <=2).
  - "solid" if most criteria are 3-4 with room to improve.
  - "ready" if the essay is strong (mostly 4-5) and clearly aligned.

## RUBRIC (from DB)
${rubricJson}

## ESSAY
${input.text}

## TASK
Grade the essay against the rubric and fill in the JSON fields.
`.trim()

        const res = await askClaude({
          system,
          user,
          max_tokens: 1200,
        })

        const durationMs = Date.now() - started

        try {
          const parsed = GradeOut.parse(coerceMinifiedJson(extractAnthropicText(res)))
          cacheSet(cacheKey, parsed, 60 * 60 * 1000)
          recordTelemetry({
            step: 'grade',
            ok: true,
            durationMs,
            meta: { cacheHit: false, criteriaCount: parsed.criteria.length },
          })

          return new Response(JSON.stringify({ ok: true, result: parsed }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          recordTelemetry({
            step: 'grade',
            ok: false,
            durationMs,
            error: String(e),
          })
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})

