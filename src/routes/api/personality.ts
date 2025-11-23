/**
 * POST /api/personality
 * Purpose: Analyze a scholarship's text to produce a structured "personality" profile
 *           (weights, themes, tone, constraints) using Claude.
 * Auth: Requires ADMIN_API_KEY. Rate limited to 10/min.
 *
 * Payload (zod-validated):
 * {
 *   scholarship_id?: string (uuid) — if provided, result is persisted to scholarship_profiles,
 *   scholarship_name?: string,
 *   raw_text: string (<= 60k chars),
 *   winner_texts?: string[] (each <= 5k chars, up to 20)
 * }
 *
 * Response: { ok: true, personality: { weights, themes, tone, constraints, notes } }
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { pool } from '@/server/db'
import { checkAdminKey } from '@/server/auth'
import { ENV } from '@/server/env'
import { rateLimit } from '@/server/rateLimit'

/**
 * Zod schema: Personality analysis output (from Claude)
 * - weights: bounded [0,1] and later normalized to sum ≈ 1
 * - themes: up to 8 items; tone: string; optional constraints/notes
 */
const PersonalityOut = z.object({
  weights: z.object({
    gpa: z.number().min(0).max(1),
    projects: z.number().min(0).max(1),
    leadership: z.number().min(0).max(1),
    community: z.number().min(0).max(1),
    need: z.number().min(0).max(1),
    background: z.number().min(0).max(1),
    research: z.number().min(0).max(1).optional().default(0),
    innovation: z.number().min(0).max(1).optional().default(0),
    extracurriculars: z.number().min(0).max(1).optional().default(0),
  }).strict(),
  themes: z.array(z.string()).max(8),
  tone: z.string(),
  constraints: z.array(z.string()).optional().default([]),
  notes: z.array(z.string()).optional().default([]),
})

/**
 * Zod schema: Personality analysis input
 * - optional scholarship_id for persistence
 * - raw_text capped to 60k chars; winner_texts up to 20 items of 5k each
 */
const PersonalityIn = z.object({
  scholarship_id: z.string().uuid().optional(),
  scholarship_name: z.string().optional(),
  raw_text: z.string().min(1).max(60_000), // cap raw text length
  winner_texts: z.array(z.string().max(5_000)).max(20).optional().default([]),
})

// centralized helpers

export const Route = createFileRoute('/api/personality')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Admin guard: require key if configured
        const auth = checkAdminKey(request, ENV.ADMIN_API_KEY)
        if (!auth.ok) return auth.res

        // Rate limit: 10/min per client for profiling
        const rl = rateLimit(request, 'api:personality', { windowMs: 60_000, max: 10 })
        if (!rl.ok) return rl.res

        const body = PersonalityIn.parse(await request.json())

        const system =
          'You are an expert reviewer of scholarship descriptions. ' +
          'Output only valid minified JSON matching the schema.'

        const truncatedRaw = body.raw_text.slice(0, 4000)
        const truncatedWinners = (body.winner_texts ?? []).slice(0, 5).map((t) => t.slice(0, 1500))

        const user = `
Return EXACTLY this JSON (no prose), filling values realistically and making sure weights sum to 1.0:

{
  "weights": {
    "gpa": 0,
    "projects": 0,
    "leadership": 0,
    "community": 0,
    "need": 0,
    "background": 0,
    "research": 0,
    "innovation": 0,
    "extracurriculars": 0
  },
  "themes": [],
  "tone": "",
  "constraints": [],
  "notes": []
}

Consider the scholarship text and any winner stories:
--- SCHOLARSHIP (${body.scholarship_name ?? 'unknown'}) ---
${truncatedRaw}

--- WINNER STORIES (optional) ---
${truncatedWinners.join('\n\n---\n')}
`.trim()

        const res = await askClaude({
          system,
          user,
          max_tokens: 700,
        })

        try {
          const txt = extractAnthropicText(res)
          const json = PersonalityOut.parse(coerceMinifiedJson(txt))

          // normalize weights to sum to 1 (safety)
          const entries = Object.entries(json.weights) as [string, number][]
          const sum = entries.reduce((a, [, v]) => a + v, 0) || 1
          const norm = Object.fromEntries(
            entries.map(([k, v]) => [k, Number((v / sum).toFixed(4))]),
          )
          const out = { ...json, weights: norm }

          // Optional persistence if scholarship_id provided
          if (body.scholarship_id) {
            await pool.query(
              `insert into scholarship_profiles (scholarship_id, weights, themes, tone)
               values ($1, $2::jsonb, $3::text[], $4::text)
               on conflict (scholarship_id) do update set
                 weights = excluded.weights,
                 themes = excluded.themes,
                 tone = excluded.tone,
                 updated_at = now()`,
              [body.scholarship_id, JSON.stringify(out.weights), out.themes, out.tone],
            )
          }

          return new Response(JSON.stringify({ ok: true, personality: out }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
