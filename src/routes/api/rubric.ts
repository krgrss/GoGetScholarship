/**
 * POST /api/rubric
 * Purpose: Upsert a rubric JSON for a scholarship.
 * Auth: Requires ADMIN_API_KEY. Rate limited to 10/min.
 *
 * Payload:
 * {
 *   scholarship_id: string (uuid),
 *   rubric: { id: string; name: string; description?: string; weight?: number }[]
 * }
 *
 * Response: { ok: true }
 *
 * GET /api/rubric?scholarship_id=...
 * Response: { ok: true, rubric: [...] } or 404 if not found.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pool } from '@/server/db'
import { rateLimit } from '@/server/rateLimit'
import { checkAdminKey } from '@/server/auth'
import { ENV } from '@/server/env'

const RubricItem = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  weight: z.number().optional(),
})

const RubricIn = z.object({
  scholarship_id: z.string().uuid(),
  rubric: z.array(RubricItem).min(1),
})

export const Route = createFileRoute('/api/rubric')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rl = rateLimit(request, 'api:rubric-get', { windowMs: 60_000, max: 60 })
        if (!rl.ok) return rl.res

        const url = new URL(request.url)
        const scholarshipId = url.searchParams.get('scholarship_id')
        if (!scholarshipId) {
          return new Response(
            JSON.stringify({ ok: false, error: 'scholarship_id is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const parsed = z.string().uuid().safeParse(scholarshipId)
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Invalid scholarship_id' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        try {
          const { rows } = await pool.query(
            `select rubric from scholarship_rubrics where scholarship_id = $1::uuid limit 1`,
            [scholarshipId],
          )

          if (rows.length === 0) {
            return new Response(
              JSON.stringify({ ok: false, error: 'Rubric not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          return new Response(
            JSON.stringify({ ok: true, rubric: rows[0].rubric }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },

      POST: async ({ request }) => {
        const auth = checkAdminKey(request, ENV.ADMIN_API_KEY)
        if (!auth.ok) return auth.res

        const rl = rateLimit(request, 'api:rubric-post', { windowMs: 60_000, max: 10 })
        if (!rl.ok) return rl.res

        let body: z.infer<typeof RubricIn>
        try {
          body = RubricIn.parse(await request.json())
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        try {
          await pool.query(
            `insert into scholarship_rubrics (scholarship_id, rubric, updated_at)
             values ($1::uuid, $2::jsonb, now())
             on conflict (scholarship_id) do update set
               rubric = excluded.rubric,
               updated_at = now()`,
            [body.scholarship_id, JSON.stringify(body.rubric)],
          )

          return new Response(JSON.stringify({ ok: true }), {
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

