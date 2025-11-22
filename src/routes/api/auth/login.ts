import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { pool } from '@/server/db'
import { setStudentCookie, clearStudentCookie, getStudentIdFromRequest } from '@/server/auth'

const LoginSchema = z.object({
  student_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
})

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof LoginSchema>
        try {
          body = LoginSchema.parse(await request.json())
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const email = body.email ?? null
        const name = body.name ?? null
        const requestedId = body.student_id ?? null

        try {
          let studentId = requestedId || getStudentIdFromRequest(request)

          // Try to find existing by email if provided
          if (!studentId && email) {
            const existing = await pool.query(
              `select id from students where email = $1::text limit 1`,
              [email],
            )
            studentId = existing.rows[0]?.id ?? null
          }

          if (!studentId) {
            studentId = randomUUID()
            await pool.query(
              `insert into students (id, name, email, metadata) values ($1::uuid, $2::text, $3::text, $4::jsonb)`,
              [studentId, name, email, { source: 'login_generated' }],
            )
          } else {
            // Ensure a row exists for the provided student id
            await pool.query(
              `insert into students (id, name, email, metadata)
               values ($1::uuid, $2::text, $3::text, $4::jsonb)
               on conflict (id) do update set
                 name = coalesce(excluded.name, students.name),
                 email = coalesce(excluded.email, students.email),
                 metadata = coalesce(students.metadata, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb)`,
              [studentId, name, email, { source: 'login_provided' }],
            )
          }

          const res = new Response(
            JSON.stringify({ ok: true, student_id: studentId }),
            { headers: { 'Content-Type': 'application/json', 'Set-Cookie': setStudentCookie(studentId) } },
          )
          return res
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
      DELETE: async () => {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearStudentCookie() },
        })
      },
    },
  },
})
