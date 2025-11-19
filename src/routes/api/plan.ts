/**
 * POST /api/plan
 * Purpose: Create or replace an application plan + tasks for a given
 *          (student_id, scholarship_id) pair, based on scholarship metadata.
 * Auth: Public for now, but rate limited to 20/min per client.
 *
 * Payload (zod-validated):
 * {
 *   student_id: string (uuid),
 *   scholarship_id: string (uuid)
 * }
 *
 * Behavior:
 * - Ensures an `applications` row exists for (student_id, scholarship_id)
 *   with status at least "planned".
 * - Creates a new `application_plans` row (removing any existing plan for
 *   that application) and a set of `application_tasks` derived from
 *   scholarship.metadata.application_components and scholarship.metadata.deadline.
 *
 * Response: { ok: true, application_id, plan_id, tasks: [...] }
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { pool } from '@/server/db'
import { rateLimit } from '@/server/rateLimit'

const PlanIn = z.object({
  student_id: z.string().uuid(),
  scholarship_id: z.string().uuid(),
})

type RawComponents = {
  essays?: number
  reference_letters?: number
  transcript_required?: boolean
  resume_required?: boolean
  portfolio_required?: boolean
  interview_possible?: boolean
}

export const Route = createFileRoute('/api/plan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = rateLimit(request, 'api:plan', { windowMs: 60_000, max: 20 })
        if (!rl.ok) return rl.res

        let body: z.infer<typeof PlanIn>
        try {
          body = PlanIn.parse(await request.json())
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: `Invalid payload: ${e}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          // Load scholarship metadata (for application_components + deadline)
          const sRes = await client.query(
            `select id, metadata
             from scholarships
             where id = $1::uuid
             limit 1`,
            [body.scholarship_id],
          )
          if (sRes.rowCount === 0) {
            await client.query('ROLLBACK')
            return new Response(
              JSON.stringify({ ok: false, error: 'Scholarship not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const metadata = (sRes.rows[0].metadata ?? {}) as any
          const components = (metadata.application_components ?? {}) as RawComponents
          const deadlineIso: string | null = metadata.deadline || null

          const today = new Date()
          const deadline = deadlineIso ? new Date(deadlineIso) : null

          function offset(days: number): Date | null {
            if (!deadline || Number.isNaN(deadline.getTime())) return null
            const d = new Date(deadline)
            d.setDate(d.getDate() - days)
            return d
          }

          // Ensure applications row exists
          const appSelect = await client.query(
            `select id, status
             from applications
             where student_id = $1::uuid
               and scholarship_id = $2::uuid
             limit 1`,
            [body.student_id, body.scholarship_id],
          )

          let applicationId: string
          if (appSelect.rowCount === 0) {
            applicationId = randomUUID()
            await client.query(
              `insert into applications (id, student_id, scholarship_id, status, created_at, updated_at)
               values ($1::uuid, $2::uuid, $3::uuid, $4::text, now(), now())`,
              [applicationId, body.student_id, body.scholarship_id, 'planned'],
            )
          } else {
            applicationId = appSelect.rows[0].id as string
            const status = (appSelect.rows[0].status as string) || 'planned'
            const nextStatus =
              status === 'submitted' || status === 'in_progress' ? status : 'planned'
            await client.query(
              `update applications
               set status = $3::text,
                   updated_at = now()
               where id = $1::uuid`,
              [applicationId, body.student_id, nextStatus],
            )
          }

          // Remove any existing plan/tasks for this application
          const existingPlans = await client.query(
            `select id from application_plans where application_id = $1::uuid`,
            [applicationId],
          )
          if (existingPlans.rowCount > 0) {
            const planIds = existingPlans.rows.map((r) => r.id as string)
            await client.query(
              `delete from application_tasks where plan_id = ANY($1::uuid[])`,
              [planIds],
            )
            await client.query(
              `delete from application_plans where application_id = $1::uuid`,
              [applicationId],
            )
          }

          const planId = randomUUID()
          await client.query(
            `insert into application_plans (id, application_id, created_at)
             values ($1::uuid, $2::uuid, now())`,
            [planId, applicationId],
          )

          type NewTask = { label: string; due: Date | null }
          const tasks: NewTask[] = []

          const essays = Number(components.essays ?? 0)
          if (essays > 0) {
            tasks.push({
              label: essays === 1 ? 'Draft main scholarship essay' : `Draft ${essays} scholarship essays`,
              due: offset(21),
            })
            tasks.push({
              label: 'Revise essay(s) and proofread',
              due: offset(14),
            })
          }

          const refs = Number(components.reference_letters ?? 0)
          if (refs > 0) {
            tasks.push({
              label: refs === 1 ? 'Ask one recommender for a letter' : `Ask ${refs} recommenders for letters`,
              due: offset(21),
            })
          }

          if (components.transcript_required) {
            tasks.push({
              label: 'Request official transcript',
              due: offset(14),
            })
          }

          if (components.resume_required) {
            tasks.push({
              label: 'Update and upload resume',
              due: offset(14),
            })
          }

          if (components.portfolio_required) {
            tasks.push({
              label: 'Assemble and upload portfolio',
              due: offset(21),
            })
          }

          if (components.interview_possible) {
            tasks.push({
              label: 'Prepare for potential interview',
              due: offset(7),
            })
          }

          if (deadline) {
            tasks.push({
              label: 'Submit full application',
              due: deadline,
            })
          }

          // If no tasks derived, create a generic one
          if (tasks.length === 0) {
            tasks.push({
              label: 'Review requirements and submit application',
              due: deadline || today,
            })
          }

          const insertedTasks: { id: string; label: string; due_date: string | null }[] = []

          for (const t of tasks) {
            const id = randomUUID()
            const dueDateSql =
              t.due && !Number.isNaN(t.due.getTime())
                ? t.due.toISOString().slice(0, 10)
                : null
            await client.query(
              `insert into application_tasks (id, plan_id, label, due_date, completed, created_at)
               values ($1::uuid, $2::uuid, $3::text, $4::date, false, now())`,
              [id, planId, t.label, dueDateSql],
            )
            insertedTasks.push({
              id,
              label: t.label,
              due_date: dueDateSql,
            })
          }

          await client.query('COMMIT')

          return new Response(
            JSON.stringify({
              ok: true,
              application_id: applicationId,
              plan_id: planId,
              tasks: insertedTasks,
            }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (e: any) {
          await pool.query('ROLLBACK')
          return new Response(
            JSON.stringify({ ok: false, error: String(e).slice(0, 4000) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        } finally {
          // If the client was never acquired due to an early error, this is a no-op
          try {
            client.release()
          } catch {}
        }
      },
    },
  },
})

