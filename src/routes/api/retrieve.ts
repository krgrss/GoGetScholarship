import { createFileRoute } from '@tanstack/react-router'
import { embedWithVoyage } from '../../server/embeddings/voyage'
import { topKByEmbedding } from '../../server/db'

type RetrieveBody = {
  student_summary: string // short normalized summary produced by LLM or form
  min_gpa?: number
  k?: number
}

export const Route = createFileRoute('/api/retrieve')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as RetrieveBody
        const [emb] = await embedWithVoyage([body.student_summary], 'voyage-3.5', 1024)
        const k = Math.max(1, Math.min(50, body.k ?? 20))
        const rows = await topKByEmbedding(emb, k, body.min_gpa ?? null)
        return new Response(JSON.stringify({ ok: true, rows }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
