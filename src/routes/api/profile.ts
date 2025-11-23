/**
 * POST /api/profile
 * Purpose: Create or update a student profile and store its Voyage embedding.
 * Auth: Public for now, but rate limited to 30/min per client.
 *
 * Payload:
 * {
 *   id?: string (uuid),
 *   name?: string,
 *   email?: string,
 *   gpa?: number (0..4),
 *   major?: string,
 *   country?: string,
 *   summary: string,
 *   metadata?: Record<string, unknown>
 * }
 *
 * Response: { ok: true, student_id: string }
 */
import { createFileRoute } from '@tanstack/react-router'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { pool } from '../../server/db'
import { embedWithVoyage } from '../../server/embeddings/voyage'
import { rateLimit } from '../../server/rateLimit'
import { setStudentCookie } from '../../server/auth'

const StudentProfileIn = z.object({
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  gpa: z.number().min(0).max(9.99).optional(),
  major: z.string().optional(),
  country: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(), // ISO date string
  ethnicity: z.string().optional(),
  level_of_study: z.string().optional(),
  summary: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const Route = createFileRoute('/api/profile')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, 'api:profile', { windowMs: 60_000, max: 30 })
        if (!rl.ok) return rl.res

        let body: z.infer<typeof StudentProfileIn>
        try {
          body = StudentProfileIn.parse(await request.json())
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const studentId = body.id ?? randomUUID()

        const [embedding] = await embedWithVoyage([body.summary])

        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          await client.query(
            `insert into students (id, name, email, gpa, major, country, gender, date_of_birth, ethnicity, level_of_study, metadata)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             on conflict (id) do update set
               name = excluded.name,
               email = excluded.email,
               gpa = excluded.gpa,
               major = excluded.major,
               country = excluded.country,
               gender = excluded.gender,
               date_of_birth = excluded.date_of_birth,
               ethnicity = excluded.ethnicity,
               level_of_study = excluded.level_of_study,
               metadata =
                 coalesce(students.metadata, '{}'::jsonb) ||
                 coalesce(excluded.metadata, '{}'::jsonb)`,
            [
              studentId,
              body.name ?? null,
              body.email ?? null,
              body.gpa ?? null,
              body.major ?? null,
              body.country ?? null,
              body.gender ?? null,
              body.date_of_birth ?? null,
              body.ethnicity ?? null,
              body.level_of_study ?? null,
              body.metadata ?? {},
            ],
          )

          await client.query(
            `insert into student_embeddings (student_id, embedding)
             values ($1, $2::vector)
             on conflict (student_id) do update set
               embedding = excluded.embedding`,
            [studentId, JSON.stringify(embedding)],
          )

          await client.query('COMMIT')
        } catch (e) {
          await client.query('ROLLBACK')
          throw e
        } finally {
          client.release()
        }

        const cookieHeader = setStudentCookie(studentId)

        return new Response(JSON.stringify({ ok: true, student_id: studentId }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookieHeader,
          },
        })
      },
    },
  },
})

