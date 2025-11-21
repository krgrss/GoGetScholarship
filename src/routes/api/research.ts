
/**
 * POST /api/research
 * Purpose: Generate "Winner Insights" and "Success Patterns" for a scholarship
 *          using Claude to analyze the scholarship description and criteria.
 *
 * Payload:
 * {
 *   scholarship_id: string (uuid)
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   research: {
 *     success_patterns: string[], // e.g. "Focus on community impact", "Highlight leadership"
 *     key_themes: string[],      // e.g. "Resilience", "Innovation"
 *     winner_profile: string     // Short description of a typical winner
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

const ResearchIn = z.object({
  scholarship_id: z.string().uuid(),
})

const ResearchOut = z.object({
  success_patterns: z.array(z.string()),
  key_themes: z.array(z.string()),
  winner_profile: z.string(),
})

// @ts-ignore
export const Route = createFileRoute('/api/research')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, 'api:research', { windowMs: 60_000, max: 10 })
        if (!rl.ok) return rl.res

        const started = Date.now()

        let body: z.infer<typeof ResearchIn>
        try {
          body = ResearchIn.parse(await request.json())
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const cacheKey = `research:sch:${body.scholarship_id}`
        const cached = cacheGet<z.infer<typeof ResearchOut>>(cacheKey)
        if (cached) {
          return new Response(
            JSON.stringify({ ok: true, research: cached }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        }

        const client = await pool.connect()
        try {
          const { rows } = await client.query(
            `SELECT name, description, raw_text, metadata FROM scholarships WHERE id = $1::uuid`,
            [body.scholarship_id]
          )

          if (rows.length === 0) {
            return new Response(
              JSON.stringify({ ok: false, error: 'Scholarship not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const scholarship = rows[0]

          const system =
            'You are an expert scholarship consultant. Analyze the scholarship description to infer what a successful applicant looks like.\n' +
            'Output ONLY minified JSON matching the schema.'

          const user = `
Analyze this scholarship and provide research insights:

NAME: ${scholarship.name}
DESCRIPTION: ${scholarship.description}
RAW TEXT: ${scholarship.raw_text?.slice(0, 3000) || ''}

Return EXACTLY this JSON:
{
  "success_patterns": ["pattern1", "pattern2", "pattern3"],
  "key_themes": ["theme1", "theme2", "theme3"],
  "winner_profile": "A short paragraph describing the ideal candidate."
}

- success_patterns: Actionable advice on what to emphasize (e.g. "Quantify your volunteer hours").
- key_themes: The core values the committee is looking for (e.g. "Social Justice", "STEM Innovation").
- winner_profile: A persona of a past winner based on the criteria.
`

          const res = await askClaude({
            system,
            user,
            max_tokens: 800,
          })

          const txt = extractAnthropicText(res)
          const parsed = ResearchOut.parse(coerceMinifiedJson(txt))

          cacheSet(cacheKey, parsed, 24 * 60 * 60 * 1000) // Cache for 24h
          
          recordTelemetry({
            step: 'research' as any,
            ok: true,
            durationMs: Date.now() - started,
          })

          return new Response(
            JSON.stringify({ ok: true, research: parsed }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (e: any) {
          console.error('Research API Error:', e)
          return new Response(
            JSON.stringify({ ok: false, error: 'Internal Server Error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        } finally {
          client.release()
        }
      },
    },
  },
})
