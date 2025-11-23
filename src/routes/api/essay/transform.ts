/**
 * POST /api/essay/transform
 * Purpose: Selection/full-essay transforms to power inline AI tooling in the Essay Workspace.
 * Auth: Public, rate limited. Admin key optional for higher limits.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { askClaude } from '@/server/llm/anthropic'
import { coerceMinifiedJson, extractAnthropicText } from '@/server/llm/json'
import { rateLimit } from '@/server/rateLimit'
import { ENV } from '@/server/env'

const Selection = z.object({
  start: z.number().nonnegative().optional(),
  end: z.number().nonnegative().optional(),
  text: z.string().optional(),
})

const TransformIn = z.object({
  essayId: z.string().optional(),
  scholarshipId: z.string().optional(),
  mode: z.union([
    z.literal('rewrite_clearer'),
    z.literal('more_personal'),
    z.literal('more_concise'),
    z.literal('grammar_only'),
    z.literal('suggest_next_sentence'),
    z.literal('reorganize_structure'),
  ]),
  contentPlain: z.string().min(1).max(20_000),
  selection: Selection.optional(),
})

const TransformOut = z.object({
  replacementText: z.string().optional(),
  fullContentHtml: z.string().optional(),
  explanation: z.string().optional(),
})

function isAdminRequest(request: Request) {
  const expected = ENV.ADMIN_API_KEY
  if (!expected) return false
  // Do not block if missing; only treat as admin when the header matches.
  const provided =
    request.headers.get('admin-api-key') ||
    request.headers.get('x-admin-key') ||
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\\s+/i, '') ||
    ''
  return provided === expected
}

export const Route = createFileRoute('/api/essay/transform')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = isAdminRequest(request)
        const rl = rateLimit(request, 'api:essay:transform', {
          windowMs: 60_000,
          max: admin ? 30 : 12,
        })
        if (!rl.ok) return rl.res

        let input: z.infer<typeof TransformIn>
        try {
          input = TransformIn.parse(await request.json())
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid payload', detail: String(e) }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const selectionText = input.selection?.text?.trim()
        const modeLabel = input.mode.replace(/_/g, ' ')
        const baseInstructions =
          'You are an essay rewriting assistant for scholarship applications. Improve clarity, authenticity, and structure without inventing facts. ' +
          'Preserve the student voice, keep length roughly similar (unless more concise is requested), and avoid generic filler. Return ONLY minified JSON.'

        const modeSpecific = (() => {
          switch (input.mode) {
            case 'rewrite_clearer':
              return 'Rewrite to be clearer and tighter while keeping meaning and specifics.'
            case 'more_personal':
              return 'Make it more personal and reflective; add brief feelings or lessons learned.'
            case 'more_concise':
              return 'Shorten by ~15-20% while keeping key details and impact.'
            case 'grammar_only':
              return 'Fix grammar/flow lightly; do NOT change meaning or add content.'
            case 'suggest_next_sentence':
              return 'Suggest the next 1-2 sentences to follow the provided text.'
            case 'reorganize_structure':
              return 'Improve paragraph flow and ordering while preserving all key details.'
            default:
              return ''
          }
        })()

        const selectionPart = selectionText
          ? `Focus ONLY on this selection:\n${selectionText}\n\nIf selection is present, return replacementText for that selection.`
          : 'No explicit selection; work on the full essay. Return fullContentHtml (plain text ok).'

        const user = `
Essay id: ${input.essayId ?? 'n/a'}
Scholarship id: ${input.scholarshipId ?? 'n/a'}
Mode: ${modeLabel}

${selectionPart}

Essay (plain):
${input.contentPlain}

Return JSON:
{
  "replacementText": "string (only if selection provided)",
  "fullContentHtml": "string (for full essay rewrite; plain text acceptable)",
  "explanation": "1-2 sentences describing changes"
}
`.trim()

        try {
          const res = await askClaude({
            system: baseInstructions + ' ' + modeSpecific,
            user,
            max_tokens: 800,
          })
          const parsed = TransformOut.parse(coerceMinifiedJson(extractAnthropicText(res)))
          return new Response(JSON.stringify({ ok: true, ...parsed }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'Transform failed',
              detail: String(e).slice(0, 4000),
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
