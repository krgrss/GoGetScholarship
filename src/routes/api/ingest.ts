import { createFileRoute } from '@tanstack/react-router'
import { pool } from '../../server/db'
import { embedWithVoyage } from '../../server/embeddings/voyage'
import { randomUUID } from 'crypto'

type IngestBody = {
  scholarships: Array<{
    name: string
    url?: string
    raw_text: string
    min_gpa?: number
    country?: string
    fields?: string[]
    metadata?: Record<string, any>
  }>
}

export const Route = createFileRoute('/api/ingest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as IngestBody
        const texts = body.scholarships.map((s) => s.raw_text)
        const embeddings = await embedWithVoyage(texts, 'voyage-3.5', 1024)

        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          for (let i = 0; i < body.scholarships.length; i++) {
            const s = body.scholarships[i]
            const id = randomUUID()
            await client.query(
              `insert into scholarships
               (id, name, url, raw_text, min_gpa, country, fields, metadata)
               values ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [id, s.name, s.url ?? null, s.raw_text, s.min_gpa ?? null, s.country ?? null, s.fields ?? null, s.metadata ?? null],
            )
            await client.query(
              `insert into scholarship_embeddings (scholarship_id, embedding)
               values ($1, $2::vector)`,
              [id, JSON.stringify(embeddings[i])],
            )
          }
          await client.query('COMMIT')
        } catch (e) {
          await client.query('ROLLBACK')
          throw e
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
