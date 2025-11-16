/**
 * POST /api/match
 * Purpose: Alias of /api/retrieve for naming consistency with docs.
 * Auth: Public, but rate limited to 30/min.
 *
 * Payload: { student_summary: string, min_gpa?: number, k?: number }
 * Response: { ok: true, rows: [{ id, name, url, min_gpa, distance, dot_sim }] }
 */
import { createFileRoute } from '@tanstack/react-router'
import { embedWithVoyage } from '../../server/embeddings/voyage'
import { topKByEmbedding } from '../../server/db'
import { rateLimit } from '../../server/rateLimit'

/**
 * Request body for /api/match (alias of /api/retrieve)
 */
type MatchBody = {
  student_summary: string
  min_gpa?: number
  k?: number
}

export const Route = createFileRoute('/api/match')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Basic rate limit: 30 requests per minute per client
        const rl = rateLimit(request, 'api:match', { windowMs: 60_000, max: 30 })
        if (!rl.ok) return rl.res

        const body = (await request.json()) as MatchBody
        const [emb] = await embedWithVoyage([body.student_summary])
        const k = Math.max(1, Math.min(50, body.k ?? 20))
        const rows = await topKByEmbedding(emb, k, body.min_gpa ?? null)
        return new Response(JSON.stringify({ ok: true, rows }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
