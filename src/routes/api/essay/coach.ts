/**
 * POST /api/essay/coach
 * Purpose: Lightweight coaching replies for the Essay Workspace chat and prompt helpers.
 * Auth: public, rate limited.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { rateLimit } from '@/server/rateLimit'

const CoachIn = z.object({
  essayId: z.string().optional(),
  scholarshipId: z.string().optional(),
  prompt: z.string().optional(),
  content: z.string().optional(),
  rubric: z.array(z.any()).optional(),
  message: z.string().min(1),
  mode: z.enum(['chat', 'prompt_explain']).optional(),
})

const CoachOut = z.object({
  reply: z.string(),
})

export const Route = createFileRoute('/api/essay/coach')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, 'api:essay:coach', { windowMs: 60_000, max: 15 })
        if (!rl.ok) return rl.res

        let input: z.infer<typeof CoachIn>
        try {
          input = CoachIn.parse(await request.json())
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid payload', detail: String(e) }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const user = `
Scholarship prompt: ${input.prompt ?? '(none)'}
Current essay (plain): ${input.content ?? '(empty)'}
Rubric (JSON): ${JSON.stringify(input.rubric ?? [])}
User question: ${input.message}
Mode: ${input.mode ?? 'chat'}

Return a single concise response (3-6 sentences). For prompt_explain, give 2-3 bullets on what to cover.
`.trim()

        try {
          const res = await askClaude({
            system:
              'You are a focused scholarship essay coach. Give concrete, rubric-aware suggestions tied to the prompt. Do not invent achievements.',
            user,
            max_tokens: 400,
          })
          const text = extractAnthropicText(res)
          // allow plain text fallback even if JSON parse fails
          let reply = text
          try {
            const parsed = CoachOut.safeParse(coerceMinifiedJson(text))
            if (parsed.success) reply = parsed.data.reply
          } catch {}
          return new Response(JSON.stringify({ ok: true, reply }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'Coach failed',
              detail: String(e).slice(0, 2000),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
