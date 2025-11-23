/**
 * POST /api/revise
 * Purpose: Targeted revision for a single rubric criterion using Claude.
 * Auth: Public (rate limited).
 *
 * Payload:
 * {
 *   text: string,
 *   rubric: { id: string; name: string; description?: string; weight?: number }[],
 *   criterion_id: string
 * }
 *
 * Response:
 * { ok: true, revised_text, rationale } on success
 * { ok: false, error } on failure
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { rateLimit } from '@/server/rateLimit'

const RubricItem = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  weight: z.number().optional(),
})

const ReviseIn = z.object({
  text: z.string().min(1).max(20_000),
  rubric: z.array(RubricItem).min(1),
  criterion_id: z.string().min(1),
})

const ReviseOut = z.object({
  revised_text: z.string(),
  rationale: z.string().optional(),
})

export const Route = createFileRoute('/api/revise')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, 'api:revise', { windowMs: 60_000, max: 15 })
        if (!rl.ok) return rl.res

        let input: z.infer<typeof ReviseIn>
        try {
          input = ReviseIn.parse(await request.json())
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const criterion = input.rubric.find((r) => r.id === input.criterion_id)
        if (!criterion) {
          return new Response(
            JSON.stringify({ ok: false, error: 'criterion_id not found in rubric' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const rubricJson = JSON.stringify(input.rubric)
        const system =
          'You are a scholarship essay revision assistant focused on a single rubric criterion. ' +
          'Improve the essay for that criterion while preserving the student voice and specifics. ' +
          'Return ONLY minified JSON with the revised text.'

        const user = `
Revise the essay ONLY for this rubric criterion:
- id: ${criterion.id}
- name: ${criterion.name}
- description: ${criterion.description ?? '(none)'}

Keep other sections intact; do not add generic fluff. Respect length and authenticity.

Rubric (full, JSON): ${rubricJson}

Essay:
${input.text}

Return JSON:
{
  "revised_text": "full revised essay text",
  "rationale": "1-2 sentences on what changed for this criterion"
}
`.trim()

        try {
          const res = await askClaude({
            system,
            user,
            max_tokens: 900,
          })

          const parsed = ReviseOut.parse(coerceMinifiedJson(extractAnthropicText(res)))
          return new Response(JSON.stringify({ ok: true, ...parsed }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
