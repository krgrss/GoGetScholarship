/**
 * POST /api/match
 * Purpose: Alias of /api/retrieve for naming consistency with docs.
 * Auth: Public, but rate limited to 30/min.
 *
 * Payload: { student_summary: string, min_gpa?: number, k?: number }
 * Response: { ok: true, rows: [{ id, name, url, min_gpa, distance, dot_sim }] }
 */
import { createFileRoute } from '@tanstack/react-router'
import { rateLimit } from '../../server/rateLimit'
import { runMatchWorkflow } from '../../server/match'

/**
 * Request body for /api/match (alias of /api/retrieve)
 */
type MatchBody = {
  student_summary: string
  min_gpa?: number
  k?: number
  use_reranker?: boolean
  eligibility?: {
    country?: string
    level_of_study?: string
    fields_of_study?: string[]
    citizenship?: string
    has_financial_need?: boolean
    gender?: string
  }
}

export const Route = createFileRoute('/api/match')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Basic rate limit: 30 requests per minute per client
        const rl = rateLimit(request, 'api:match', { windowMs: 60_000, max: 30 })
        if (!rl.ok) return rl.res

        const body = (await request.json()) as MatchBody

        const eligibility = body.eligibility
          ? {
              country: body.eligibility.country,
              levelOfStudy: body.eligibility.level_of_study,
              fieldsOfStudy: body.eligibility.fields_of_study,
              citizenship: body.eligibility.citizenship,
              hasFinancialNeed: body.eligibility.has_financial_need,
              gender: body.eligibility.gender,
            }
          : undefined

        const res = await runMatchWorkflow({
          studentSummary: body.student_summary,
          minGpa: body.min_gpa,
          k: body.k,
          useReranker: body.use_reranker ?? true,
          eligibility,
        })

        const status = res.ok ? 200 : 400
        return new Response(JSON.stringify(res), {
          status,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
