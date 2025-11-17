/**
 * POST /api/draft
 * Purpose: Generate an authentic, scholarship-tailored essay draft using Claude.
 * Auth: Requires ADMIN_API_KEY. Rate limited to 10/min.
 *
 * Payload (zod-validated):
 * {
 *   scholarship_id?: uuid (if provided with student_id, the draft is persisted),
 *   student_id?: uuid,
 *   scholarship_name: string,
 *   scholarship_text?: string (<= 60k chars),
 *   personality: { weights, themes, tone, constraints?, notes? },
 *   student_profile: { name?, gpa?, major?, country?, activities[], awards[], projects[], background[], stories[] },
 *   word_target?: number (150..800),
 *   style?: string (override tone)
 * }
 *
 * Response: { ok: true, draft, explanation, outline?, safety }
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { pool } from '@/server/db'
import { randomUUID } from 'crypto'
import { checkAdminKey } from '@/server/auth'
import { ENV } from '@/server/env'
import { rateLimit } from '@/server/rateLimit'
import { cacheGet, cacheSet } from '@/server/cache'
import { recordTelemetry } from '@/server/telemetry'

/**
 * Zod schema: Scholarship personality used for drafting
 */
const Personality = z.object({
  weights: z.record(z.string(), z.number()),
  themes: z.array(z.string()),
  tone: z.string(),
  constraints: z.array(z.string()).optional().default([]),
  notes: z.array(z.string()).optional().default([]),
})

/**
 * Zod schema: Draft request payload
 */
const DraftIn = z.object({
  scholarship_name: z.string(),
  scholarship_text: z.string().max(60_000).optional().default(''),
  personality: Personality, // output from /api/personality
  scholarship_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  student_profile: z.object({
    name: z.string().max(200).optional(),
    gpa: z.number().optional(),
    major: z.string().max(200).optional(),
    country: z.string().max(100).optional(),
    activities: z.array(z.string().max(1_000)).max(50).optional().default([]),
    awards: z.array(z.string().max(1_000)).max(50).optional().default([]),
    projects: z.array(z.string().max(2_000)).max(50).optional().default([]),
    background: z.array(z.string().max(200)).max(20).optional().default([]), // e.g., first-gen, immigrant, etc.
    stories: z.array(z.string().max(2_000)).max(50).optional().default([]),
  }),
  word_target: z.number().int().min(150).max(800).optional().default(350),
  style: z.string().optional(), // override tone if you want
})

/**
 * Zod schema: Draft response payload
 */
const DraftOut = z.object({
  draft: z.string(),
  explanation: z.string(),
  outline: z.array(z.string()).optional().default([]),
  safety: z.object({
    used_only_provided_facts: z.boolean(),
    missing_info_flags: z.array(z.string()),
  }),
})

// centralized helpers

export const Route = createFileRoute('/api/draft')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Admin guard: require key if configured
        const auth = checkAdminKey(request, ENV.ADMIN_API_KEY)
        if (!auth.ok) return auth.res

        // Rate limit: 10/min per client for drafting
        const rl = rateLimit(request, 'api:draft', { windowMs: 60_000, max: 10 })
        if (!rl.ok) return rl.res

        const input = DraftIn.parse(await request.json())

        const cacheKey = JSON.stringify({
          kind: 'draft-api',
          scholarship_name: input.scholarship_name,
          personality: input.personality,
          student_profile: input.student_profile,
          word_target: input.word_target,
          style: input.style ?? null,
          version: 1,
        })

        const cached = cacheGet<ReturnType<typeof DraftOut.parse>>(cacheKey)
        if (cached) {
          return new Response(JSON.stringify({ ok: true, ...cached }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const system =
          'You are an assistant that drafts scholarship application essays ' +
          'AUTHENTICALLY. Do NOT fabricate achievements. Use only provided facts. ' +
          'Output ONLY valid minified JSON matching the schema.'

        const weightPairs = Object.entries(input.personality.weights)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')

        const user = `
Scholarship: ${input.scholarship_name}
Scholarship text (optional): ${input.scholarship_text.slice(0, 4000)}

Personality:
- Weights: ${weightPairs}
- Themes: ${input.personality.themes.join(', ')}
- Tone: ${input.style ?? input.personality.tone}
- Constraints: ${(input.personality.constraints ?? []).join('; ')}

Student profile (facts only):
${JSON.stringify(input.student_profile, null, 2)}

Target words: ~${input.word_target}

Return EXACTLY this JSON:
{
  "draft": "essay text",
  "explanation": "why this aligns with weights/themes; call out 2-3 concrete alignments",
  "outline": ["intro ...", "body a ...", "body b ...", "close ..."],
  "safety": {
    "used_only_provided_facts": true,
    "missing_info_flags": []
  }
}

Rules:
- Lead with the strongest signals implied by weights (e.g., GPA/projects if high).
- Reframe the SAME stories differently if tone/themes suggest it.
- Respect constraints (e.g., min GPA, country) and flag mismatches in missing_info_flags.
- No bullet spam in the draft; write in paragraphs.
`.trim()

        const started = Date.now()
        const res = await askClaude({
          system,
          user,
          max_tokens: 1600,
        })
        const durationMs = Date.now() - started

        try {
          const json = DraftOut.parse(coerceMinifiedJson(extractAnthropicText(res)))

          cacheSet(cacheKey, json, 60 * 60 * 1000)
          recordTelemetry({ step: 'draft', ok: true, durationMs })

          // Optional persistence if both IDs provided
          if (input.scholarship_id && input.student_id) {
            await pool.query(
              `insert into drafts (id, student_id, scholarship_id, kind, content, explanation)
               values ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::text)`,
              [randomUUID(), input.student_id, input.scholarship_id, 'tailored', json.draft, json.explanation],
            )
          }

          return new Response(JSON.stringify({ ok: true, ...json }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          recordTelemetry({ step: 'draft', ok: false, durationMs, error: String(e) })
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
