/**
 * GET /api/admin/students
 * Purpose: Admin-only backdoor to list or fetch student profiles from the database.
 * Auth: Requires ADMIN_API_KEY provided via `admin-api-key` header or `admin_key` query param.
 * Query params:
 *   - id: optional student UUID to fetch a single record
 *   - limit: optional number of rows to return (default 20, max 100)
 */
import { createFileRoute } from '@tanstack/react-router'
import { rateLimit } from '@/server/rateLimit'
import { pool } from '@/server/db'
import { ENV } from '@/server/env'

function checkAdminKey(request: Request): Response | null {
  const url = new URL(request.url)
  const keyFromHeader = request.headers.get('admin-api-key')
  const keyFromQuery = url.searchParams.get('admin_key')
  const adminKey = keyFromHeader || keyFromQuery
  if (!adminKey || adminKey !== ENV.ADMIN_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

export const Route = createFileRoute('/api/admin/students')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rl = rateLimit(request, 'api:admin:students', { windowMs: 60_000, max: 30 })
        if (!rl.ok) return rl.res

        const unauthorized = checkAdminKey(request)
        if (unauthorized) return unauthorized

        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        const limit = Math.min(
          100,
          Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10)),
        )

        try {
          if (id) {
            const { rows } = await pool.query(
              `select id, name, gpa, major, country, summary, metadata, created_at
               from students
               where id = $1::uuid
               limit 1`,
              [id],
            )
            if (rows.length === 0) {
              return new Response(
                JSON.stringify({ ok: false, error: 'Student not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } },
              )
            }
            return new Response(JSON.stringify({ ok: true, student: rows[0] }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const { rows } = await pool.query(
            `select id, name, gpa, major, country, summary, metadata, created_at
             from students
             order by created_at desc
             limit $1`,
            [limit],
          )

          return new Response(JSON.stringify({ ok: true, students: rows }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
