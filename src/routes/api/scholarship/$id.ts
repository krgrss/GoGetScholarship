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
  id: z.string().min(1),
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

        // Decide whether `id` looks like a UUID (DB primary key) or an external key
        // from the ingestion dataset (metadata.id such as "3m-national-student-fellowship-ca-ug-2025").
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        )

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
                p.tone,
                (
                  select coalesce(
                    json_agg(
                      json_build_object(
                        'winner_name', w.winner_name,
                        'year', w.year,
                        'story_excerpt', w.story_excerpt,
                        'themes', w.themes,
                        'angle', w.angle,
                        'source_url', w.source_url
                      )
                      order by coalesce(w.year, 0) desc, w.created_at desc
                    ),
                    '[]'::json
                  )
                  from scholarship_winners w
                  where w.scholarship_id = s.id
                ) as winners
              from scholarships s
              left join scholarship_profiles p
                on p.scholarship_id = s.id
              where
                case
                  when $2::boolean then s.id = $1::uuid
                  else s.metadata->>'id' = $1::text
                end
              limit 1
            `,
            [id, isUuid],
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
            winners: Array.isArray(row.winners) ? (row.winners as any[]) : [],
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
