import { createFileRoute } from '@tanstack/react-router'
import { pool } from '@/server/db'
import { getStudentIdFromRequest, setStudentCookie, clearStudentCookie } from '@/server/auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const studentId = getStudentIdFromRequest(request)
        if (!studentId) {
          return new Response(JSON.stringify({ ok: true, student: null }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
        try {
          const { rows } = await pool.query(
            `select id, name, email, metadata from students where id = $1::uuid limit 1`,
            [studentId],
          )
          if (!rows.length) {
            return new Response(JSON.stringify({ ok: true, student: null }), {
              headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearStudentCookie() },
            })
          }
          return new Response(JSON.stringify({ ok: true, student: rows[0] }), {
            headers: { 'Content-Type': 'application/json', 'Set-Cookie': setStudentCookie(studentId) },
          })
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
