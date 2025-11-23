/**
 * POST /api/explain-fit
 * Purpose: Given a student_id and scholarship_id, generate a short
 *          "Why this fits you" style explanation using Claude.
 * Auth: Public for now; rate limited to 20/min per client.
 *
 * Payload (zod-validated):
 * {
 *   student_id: string (uuid),
 *   scholarship_id: string (uuid)
 * }
 *
 * Response on success:
 * {
 *   ok: true,
 *   explanation: {
 *     reasons: string[],
 *     eligibility: string[],
 *     gaps: string[],
 *     score: number
 *   }
 * }
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pool } from '@/server/db'
import { rateLimit } from '@/server/rateLimit'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { cacheGet, cacheSet } from '@/server/cache'
import { recordTelemetry } from '@/server/telemetry'

const ExplainFitIn = z.object({
  student_id: z.string().uuid(),
  scholarship_id: z.string().uuid(),
})

const ExplainFitOut = z.object({
  reasons: z.array(z.string()),
  eligibility: z.array(z.string()),
  gaps: z.array(z.string()),
  score: z.number().min(0).max(100),
})

export const Route = createFileRoute('/api/explain-fit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, 'api:explain-fit', { windowMs: 60_000, max: 20 })
        if (!rl.ok) return rl.res

        const started = Date.now()

        let body: z.infer<typeof ExplainFitIn>
        try {
          body = ExplainFitIn.parse(await request.json())
        } catch (e: any) {
          recordTelemetry({
            step: 'explain-fit',
            ok: false,
            durationMs: Date.now() - started,
            error: String(e),
          })
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const cacheKey = `fit:user:${body.student_id}:sch:${body.scholarship_id}`
        const cached = cacheGet<z.infer<typeof ExplainFitOut>>(cacheKey)
        if (cached) {
          recordTelemetry({
            step: 'explain-fit',
            ok: true,
            durationMs: Date.now() - started,
            meta: { cacheHit: true },
          })
          return new Response(
            JSON.stringify({ ok: true, explanation: cached }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        }

        const client = await pool.connect()
        try {
          const { rows } = await client.query(
            `
              select
                s.id as scholarship_id,
                s.name as scholarship_name,
                s.min_gpa,
                s.country as scholarship_country,
                s.fields,
                s.metadata as scholarship_metadata,
                s.raw_text,
                p.weights,
                p.themes,
                p.tone,
                st.id as student_id,
                st.name as student_name,
                st.gpa as student_gpa,
                st.major as student_major,
                st.country as student_country,
                st.metadata as student_metadata
              from scholarships s
              left join scholarship_profiles p
                on p.scholarship_id = s.id
              join students st
                on st.id = $2::uuid
              where s.id = $1::uuid
              limit 1
            `,
            [body.scholarship_id, body.student_id],
          )

          if (rows.length === 0) {
            recordTelemetry({
              step: 'explain-fit',
              ok: false,
              durationMs: Date.now() - started,
              error: 'Scholarship or student not found',
            })
            return new Response(
              JSON.stringify({ ok: false, error: 'Scholarship or student not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const row = rows[0] as any

          const scholarship = {
            id: row.scholarship_id as string,
            name: row.scholarship_name as string,
            min_gpa: row.min_gpa as number | null,
            country: row.scholarship_country as string | null,
            fields: (row.fields as string[] | null) ?? [],
            metadata: row.scholarship_metadata ?? {},
            raw_text: row.raw_text as string,
            personality: row.weights && row.tone
              ? {
                  weights: row.weights as Record<string, number>,
                  themes: (row.themes as string[] | null) ?? [],
                  tone: row.tone as string,
                }
              : null,
          }

          const student = {
            id: row.student_id as string,
            name: row.student_name as string | null,
            gpa: row.student_gpa as number | null,
            major: row.student_major as string | null,
            country: row.student_country as string | null,
            metadata: row.student_metadata ?? {},
          }

          const system =
            'You are an explanation engine for a scholarship matching assistant.\n' +
            '- You ONLY use the fields provided from the database.\n' +
            '- Do NOT invent eligibility criteria or demographics.\n' +
            '- If something is unknown or not provided, say that it is unclear.\n' +
            'Output ONLY minified JSON matching the schema.'

          const user = `
Return EXACTLY this JSON (no prose, no markdown):
{
  "reasons": [],
  "eligibility": [],
  "gaps": [],
  "score": 0
}

Interpretation:
- "reasons": 2-4 short bullets on why this scholarship fits the student (themes, GPA, country, activities, demographics, etc.).
- "eligibility": 1-3 bullets stating whether the student appears eligible (GPA, country, level, demographics), referencing ONLY the scholarship data and student fields shown below.
- "gaps": 0-3 bullets on possible issues, risks, or missing information (e.g., GPA too low, unclear citizenship, heavy workload). If you are unsure, say that it is unclear rather than guessing.
- "score": overall 0-100 fit score (100 = extremely strong fit).

Grounding rules:
- Only reference eligibility criteria that appear in the provided scholarship data.
- Do not assume demographics if they are not present in the student metadata.
- When useful, mention which themes or weight categories from personality.weights/personality.themes you are drawing on.

## STUDENT PROFILE (from DB, minified)
${JSON.stringify(student)}

## SCHOLARSHIP ELIGIBILITY & THEMES (from DB, minified)
${JSON.stringify({
  id: scholarship.id,
  name: scholarship.name,
  min_gpa: scholarship.min_gpa,
  country: scholarship.country,
  fields: scholarship.fields,
  metadata: scholarship.metadata,
  personality: scholarship.personality,
  raw_text: scholarship.raw_text.slice(0, 2500),
})}

## TASK
Using ONLY the information above, fill in the JSON fields with concise bullets.
`.trim()

          const res = await askClaude({
            system,
            user,
            max_tokens: 700,
          })

          const txt = extractAnthropicText(res)
          const parsed = ExplainFitOut.parse(coerceMinifiedJson(txt))

          cacheSet(cacheKey, parsed, 24 * 60 * 60 * 1000)
          recordTelemetry({
            step: 'explain-fit',
            ok: true,
            durationMs: Date.now() - started,
            meta: { cacheHit: false },
          })

          return new Response(
            JSON.stringify({ ok: true, explanation: parsed }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (e: any) {
          recordTelemetry({
            step: 'explain-fit',
            ok: false,
            durationMs: Date.now() - started,
            error: String(e),
          })
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        } finally {
          client.release()
        }
      },
    },
  },
})
