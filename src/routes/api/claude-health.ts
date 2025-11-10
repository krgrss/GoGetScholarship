import { createFileRoute } from '@tanstack/react-router'
import { askClaude } from '../../server/llm/anthropic'

// Server routes live in src/routes with handlers per method (GET/POST) 
export const Route = createFileRoute('/api/claude-health')({
  server: {
    handlers: {
      GET: async () => {
        const res = await askClaude({
          user: 'Reply with the single word: ready.',
          max_tokens: 8,
        })
        // Anthropic SDK returns a Message with content array; unwrap simple text
        const text =
          (res.content?.[0] as any)?.text ??
          (Array.isArray(res.content) ? JSON.stringify(res.content) : 'ok')
        return new Response(JSON.stringify({ ok: true, text }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
