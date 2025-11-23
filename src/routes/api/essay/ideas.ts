/**
 * POST /api/essay/ideas
 * Purpose: Generate hooks, story prompts, and gap suggestions for the Essay Workspace sidebar.
 * Auth: Public, rate limited. Admin key optional for higher limits.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { rateLimit } from '@/server/rateLimit'
import { ENV } from '@/server/env'

const IdeasIn = z.object({
  essayId: z.string().optional(),
  scholarshipId: z.string().optional(),
  prompt: z.string().min(1),
  existingContent: z.string().optional(),
})

const IdeasOut = z.object({
  hooks: z.array(z.string()),
  storyPrompts: z.array(z.string()),
  gaps: z.array(z.string()),
  note: z.string().optional(),
})

function isAdminRequest(request: Request) {
  const expected = ENV.ADMIN_API_KEY
  if (!expected) return false
  const provided =
    request.headers.get('admin-api-key') ||
    request.headers.get('x-admin-key') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\\s+/i, '') ||
    ''
  return provided === expected
}

export const Route = createFileRoute('/api/essay/ideas')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = isAdminRequest(request)
        const rl = rateLimit(request, 'api:essay:ideas', { windowMs: 60_000, max: admin ? 30 : 12 })
        if (!rl.ok) return rl.res

        let input: z.infer<typeof IdeasIn>
        try {
          input = IdeasIn.parse(await request.json())
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid payload', detail: String(e) }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const user = `
Prompt: ${input.prompt}

Essay (plain): ${input.existingContent ?? '(none yet)'}

Return JSON:
{
  "hooks": ["short opening hooks tailored to the prompt and essay"],
  "storyPrompts": ["story prompts to unlock concrete anecdotes"],
  "gaps": ["what's missing vs the prompt/rubric (high level)"]
}

Rules:
- Never include raw winner essays; you may reference patterns in paraphrased form.
- Keep suggestions concise (1-2 sentences each).
`.trim()

        try {
          const res = await askClaude({
            system:
              'You are an essay ideas generator for scholarships. Provide hooks, story prompts, and missing elements tailored to the given prompt and draft. ' +
              'Focus on specificity, impact, and reflection. Return ONLY minified JSON.',
            user,
            max_tokens: 600,
          })
          const parsed = IdeasOut.parse(coerceMinifiedJson(extractAnthropicText(res)))
          return new Response(JSON.stringify({ ok: true, ...parsed }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          // Safe fallback so the UI still renders
          return new Response(
            JSON.stringify({
              ok: true,
              hooks: [
                'Open with the moment you realized this issue mattered to you.',
                'Start with a one-sentence snapshot of impact or change.',
              ],
              storyPrompts: [
                'Describe the toughest obstacle and how you adapted.',
                'Share a small, concrete outcome that proves impact.',
              ],
              gaps: [
                'Add one metric to quantify your outcome.',
                'Include a brief reflection on what changed for you.',
              ],
              note: 'Fallback ideas (LLM unavailable): replace when Claude is reachable.',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
