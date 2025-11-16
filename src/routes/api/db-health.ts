/**
 * GET /api/db-health
 * Purpose: Sanity check for Postgres connectivity.
 * Response: { ok: boolean }
 */
import { createFileRoute } from '@tanstack/react-router'
import { dbHealth } from '../../server/db'

export const Route = createFileRoute('/api/db-health')({
  server: {
    handlers: {
      GET: async () => {
        const ok = await dbHealth()
        return new Response(JSON.stringify(ok), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
