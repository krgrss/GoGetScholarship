/**
 * GET /api/scholarship/$id
 * Purpose: Fetch a single scholarship plus its stored personality profile (if any).
 * Auth: Public. Rate limited to 60/min per client.
 *
 * Response:
 *   { ok: true, scholarship, personality? } on success
 *   { ok: false, error } with 4xx/5xx status on failure
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pool } from '@/server/db'
import { rateLimit } from '@/server/rateLimit'

const IdParams = z.object({
  id: z.string().uuid(),
})

export const Route = createFileRoute('/api/scholarship/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Basic rate limit: 60 requests per minute per client
        const rl = rateLimit(request, 'api:scholarship-detail', {
          windowMs: 60_000,
          max: 60,
        })
        if (!rl.ok) return rl.res

        const parsed = IdParams.safeParse(params)
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Invalid scholarship id' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
        const { id } = parsed.data

        try {
          const { rows } = await pool.query(
            `
              select
                s.id,
                s.name,
                s.sponsor,
                s.url,
                s.raw_text,
                s.min_gpa,
                s.country,
                s.fields,
                s.metadata,
                p.weights,
                p.themes,
                p.tone
              from scholarships s
              left join scholarship_profiles p
                on p.scholarship_id = s.id
              where s.id = $1::uuid
              limit 1
            `,
            [id],
          )

          if (rows.length === 0) {
            return new Response(
              JSON.stringify({ ok: false, error: 'Scholarship not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const row = rows[0] as any

          const scholarship = {
            id: row.id as string,
            name: row.name as string,
            sponsor: row.sponsor as string | null,
            url: row.url as string | null,
            raw_text: row.raw_text as string,
            min_gpa: row.min_gpa,
            country: row.country as string | null,
            fields: (row.fields as string[] | null) ?? null,
            metadata: row.metadata,
          }

          const personality =
            row.weights && row.tone
              ? {
                  weights: row.weights as Record<string, number>,
                  themes: (row.themes as string[] | null) ?? [],
                  tone: row.tone as string,
                  constraints: [] as string[],
                  notes: [] as string[],
                }
              : null

          return new Response(
            JSON.stringify({ ok: true, scholarship, personality }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (e: any) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: String(e).slice(0, 4000),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})

