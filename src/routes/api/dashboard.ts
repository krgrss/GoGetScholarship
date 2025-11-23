
import { createFileRoute } from '@tanstack/react-router'
import { pool } from '@/server/db'
import { getStudentIdFromRequest } from '@/server/auth'

function deriveWorkload(meta: any): { label: 'Light' | 'Medium' | 'Heavy'; items: string[] } {
  const components = meta?.application_components || {}
  const items: string[] = []
  let score = 0
  const essays = Number(components.essays ?? 0)
  const refs = Number(components.reference_letters ?? 0)
  if (essays) {
    items.push(`${essays} essay${essays === 1 ? '' : 's'}`)
    score += essays * 2
  }
  if (refs) {
    items.push(`${refs} rec${refs === 1 ? '' : 's'}`)
    score += refs
  }
  if (components.transcript_required) {
    items.push('Transcript')
    score += 1
  }
  if (components.resume_required) {
    items.push('Resume')
    score += 1
  }
  if (components.portfolio_required) {
    items.push('Portfolio')
    score += 2
  }
  if (components.interview_possible) {
    items.push('Interview')
    score += 2
  }
  let label: 'Light' | 'Medium' | 'Heavy' = 'Medium'
  if (score <= 2) label = 'Light'
  else if (score >= 5) label = 'Heavy'
  return { label, items }
}

export const Route = createFileRoute('/api/dashboard')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const raw =
          (url.searchParams.get('student_id') || getStudentIdFromRequest(request) || '').trim()
        const uuidRegex =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        const studentId = uuidRegex.test(raw) ? raw : null

        if (!studentId) {
          return new Response(JSON.stringify({ ok: false, error: 'Missing or invalid student_id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const tableCheck = await pool.query(
            `select
               to_regclass('public.application_plans') as plans,
               to_regclass('public.application_tasks') as tasks,
               to_regclass('public.drafts') as drafts
             `,
          )

          const hasPlans = Boolean(tableCheck.rows?.[0]?.plans)
          const hasTasks = Boolean(tableCheck.rows?.[0]?.tasks)
          const hasDrafts = Boolean(tableCheck.rows?.[0]?.drafts)

          const selectColumns = [
            'a.id as application_id',
            'a.status as application_status',
            's.id as scholarship_id',
            's.name as scholarship_name',
            's.sponsor',
            's.metadata',
            hasDrafts ? "coalesce(d.id, '') as draft_id" : "'' as draft_id",
            hasDrafts ? "coalesce(d.content, '') as draft_content" : "'' as draft_content",
            hasPlans && hasTasks
              ? 'coalesce(task_counts.total_tasks, 0) as total_tasks'
              : '0 as total_tasks',
            hasPlans && hasTasks
              ? 'coalesce(task_counts.completed_tasks, 0) as completed_tasks'
              : '0 as completed_tasks',
          ]

          const joins = [
            'join scholarships s on s.id = a.scholarship_id',
            hasDrafts
              ? 'left join drafts d on d.student_id = a.student_id and d.scholarship_id = a.scholarship_id'
              : null,
            hasPlans && hasTasks
              ? `left join lateral (
                   select
                     count(*) as total_tasks,
                     count(*) filter (where completed) as completed_tasks
                   from application_plans ap
                   join application_tasks t on t.plan_id = ap.id
                   where ap.application_id = a.id
                 ) as task_counts on true`
              : null,
          ].filter((j): j is string => Boolean(j))

          const sql = `
            select ${selectColumns.join(',\n              ')}
            from applications a
            ${joins.join('\n            ')}
            where a.student_id::text = $1::text
            order by a.created_at desc
          `

          const result = await pool.query(sql, [studentId])
          const rows = result.rows as {
            application_id: string
            application_status: string
            scholarship_id: string
            scholarship_name: string
            sponsor: string | null
            metadata: any
            draft_id: string
            draft_content: string | null
            total_tasks: number
            completed_tasks: number
          }[]

          // Calculate KPIs
          const totalApplications = rows.length
          const completed = rows.filter((r) => (r.draft_content ?? '').length > 1000 || r.completed_tasks > 0).length
          const inProgress = totalApplications - completed

          // Calculate potential value (sum of max amounts where present)
          const potentialValueNumber = rows.reduce((sum, r) => {
            const meta = (r.metadata ?? {}) as any
            const amountMax = Number(meta.amount_max ?? meta.amount_min ?? 0)
            return sum + (Number.isFinite(amountMax) ? amountMax : 0)
          }, 0)

          const applications = rows.map((r) => {
            const meta = (r.metadata ?? {}) as any
            const contentLength = (r.draft_content ?? '').length
            const hasTasks = r.total_tasks > 0
            const taskProgress =
              hasTasks && r.total_tasks > 0
                ? Math.round((r.completed_tasks / r.total_tasks) * 100)
                : 0
            const draftProgress = Math.round((contentLength / 2000) * 100)
            const progress = hasTasks ? taskProgress : draftProgress
            const isSubmitted = progress >= 100

            const deadlineRaw = meta.deadline as string | undefined
            let deadlineLabel = 'No deadline'
            if (deadlineRaw) {
              const d = new Date(deadlineRaw)
              deadlineLabel = Number.isNaN(d.getTime())
                ? deadlineRaw
                : d.toLocaleDateString()
            }

            const provider =
              r.sponsor ||
              (typeof meta.provider_name === 'string' ? meta.provider_name : null) ||
              'Unknown provider'

            const workload = deriveWorkload(meta)
            let readiness: 'needs_work' | 'solid' | 'ready' = 'needs_work'
            if (progress >= 80) readiness = 'ready'
            else if (progress >= 50) readiness = 'solid'

            return {
              id: r.scholarship_id,
              draftId: r.draft_id || r.application_id,
              name: r.scholarship_name,
              provider,
              deadline: deadlineLabel,
              status: isSubmitted
                ? 'Submitted'
                : hasTasks
                  ? r.completed_tasks > 0
                    ? 'Planned (in progress)'
                    : 'Planned'
                  : 'In Progress',
              progress,
              readiness,
              nextAction: isSubmitted
                ? 'Wait for Decision'
                : hasTasks
                  ? r.completed_tasks === r.total_tasks
                    ? 'Review and submit'
                    : 'Complete plan tasks'
                  : 'Continue Drafting',
              workloadLabel: workload.label,
              workloadItems: workload.items,
            }
          })

          return new Response(
            JSON.stringify({
              ok: true,
              kpi: {
                total: totalApplications,
                inProgress,
                completed,
                potentialValue: `$${potentialValueNumber.toLocaleString()}`,
              },
              applications,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error) {
          console.error('Dashboard API Error:', error)
          return new Response(
            JSON.stringify({ ok: false, error: 'Internal Server Error' }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
