/**
 * GET /api/admin/telemetry
 * Purpose: Expose recent telemetry events for the admin debug UI.
 * Auth: Currently public (read-only); safe for local dev/hackathon.
 *
 * Query params:
 *   ?limit=50  // optional, default 100, max 200
 *
 * Response:
 *   { ok: true, events: TelemetryEvent[] }
 */
import { createFileRoute } from '@tanstack/react-router'
import { getTelemetryEvents } from '@/server/telemetry'

export const Route = createFileRoute('/api/admin/telemetry')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const limitParam = url.searchParams.get('limit')
        let limit = Number(limitParam ?? '100')
        if (!Number.isFinite(limit) || limit <= 0) limit = 100
        if (limit > 200) limit = 200

        const events = getTelemetryEvents(limit)
        return new Response(JSON.stringify({ ok: true, events }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})

