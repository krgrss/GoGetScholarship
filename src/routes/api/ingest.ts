/**
 * POST /api/ingest
 * Purpose: Bulk-ingest scholarships and store their Voyage embeddings in Postgres (pgvector).
 * Auth: Requires ADMIN_API_KEY via x-admin-key/x-api-key/Authorization headers.
 * Rate limit: 5 requests per minute per client.
 *
 * Payload (zod-validated):
 * {
 *   scholarships: Array<{
 *     name: string,
 *     sponsor?: string,
 *     url?: string (URL),
 *     raw_text: string (<= 50k chars),
 *     min_gpa?: number (0..4),
 *     country?: string,
 *     fields?: string[] (<= 50),
 *     metadata?: Record<string, unknown>
 *   }>
 * }
 *
 * Behavior:
 * - Calls Voyage embeddings API once with all texts (dimension = ENV.EMBED_DIM).
 * - Verifies embedding count and dimension.
 * - Inserts rows into scholarships and scholarship_embeddings in a single transaction.
 *
 * Response: { ok: true, inserted: number }
 */
import { createFileRoute } from '@tanstack/react-router'
import { pool } from '../../server/db'
import { embedWithVoyage } from '../../server/embeddings/voyage'
import { randomUUID } from 'crypto'
import { ENV } from '../../server/env'
import { z } from 'zod'
import { checkAdminKey } from '../../server/auth'
import { rateLimit } from '../../server/rateLimit'

/**
 * Zod schema: Scholarship ingestion item
 * - name (required), sponsor/url (optional)
 * - raw_text capped to 50k chars, fields capped to 50 items
 * - numeric min_gpa in [0,4]
 */
const Scholarship = z.object({
  name: z.string().min(1),
  sponsor: z.string().optional(),
  url: z.string().url().optional(),
  raw_text: z.string().min(1).max(50_000), // cap size to avoid huge payloads
  min_gpa: z.number().min(0).max(4).optional(),
  country: z.string().optional(),
  fields: z.array(z.string()).max(50).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

/**
 * Zod schema: Ingest request payload
 * - scholarships: 1..100 items
 */
const IngestBody = z.object({
  scholarships: z.array(Scholarship).min(1).max(100),
})

export const Route = createFileRoute('/api/ingest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Admin guard: require key if configured
        const auth = checkAdminKey(request, ENV.ADMIN_API_KEY)
        if (!auth.ok) return auth.res

        // Rate limit: keep ingest limited (5/min per client)
        const rl = rateLimit(request, 'api:ingest', { windowMs: 60_000, max: 5 })
        if (!rl.ok) return rl.res

        let body: z.infer<typeof IngestBody>
        try {
          body = IngestBody.parse(await request.json())
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const texts = body.scholarships.map((s) => s.raw_text)

        let embeddings: number[][]
        try {
          embeddings = await embedWithVoyage(texts)
        } catch (e: any) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: `Embedding error: ${String(e)}`,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }

        if (embeddings.length !== body.scholarships.length) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Embedding count mismatch' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
        const dim = embeddings[0]?.length ?? 0
        if (dim !== ENV.EMBED_DIM) {
          return new Response(
            JSON.stringify({ ok: false, error: `Unexpected embedding dim ${dim}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          for (let i = 0; i < body.scholarships.length; i++) {
            const s = body.scholarships[i]
            const id = randomUUID()
            await client.query(
              `insert into scholarships
               (id, name, sponsor, url, raw_text, min_gpa, country, fields, metadata)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
              [
                id,
                s.name,
                s.sponsor ?? null,
                s.url ?? null,
                s.raw_text,
                s.min_gpa ?? null,
                s.country ?? null,
                s.fields ?? null,
                s.metadata ?? null,
              ],
            )
            await client.query(
              `insert into scholarship_embeddings (scholarship_id, embedding)
               values ($1, $2::vector)`,
              [id, JSON.stringify(embeddings[i])],
            )
          }
          await client.query('COMMIT')
        } catch (e: any) {
          await client.query('ROLLBACK')
          return new Response(
            JSON.stringify({
              ok: false,
              error: `Database error: ${String(e).slice(0, 4000)}`,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        } finally {
          client.release()
        }

        return new Response(JSON.stringify({ ok: true, inserted: body.scholarships.length }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
