
import { createFileRoute } from '@tanstack/react-router'
import { pool } from '@/server/db'

export const Route = createFileRoute('/api/dashboard')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const studentId = url.searchParams.get('student_id')

        if (!studentId) {
          return new Response(JSON.stringify({ ok: false, error: 'Missing student_id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          // Fetch drafts joined with scholarships.
          // We treat every draft as an "application" in progress or completed.
          const sql = `
            select
              d.id as draft_id,
              d.created_at,
              d.content,
              s.id as scholarship_id,
              s.name as scholarship_name,
              s.sponsor,
              s.metadata
            from drafts d
            join scholarships s on d.scholarship_id = s.id
            where d.student_id = $1::uuid
            order by d.created_at desc
          `

          const result = await pool.query(sql, [studentId])
          const rows = result.rows as {
            draft_id: string
            created_at: string
            content: string | null
            scholarship_id: string
            scholarship_name: string
            sponsor: string | null
            metadata: any
          }[]

          // Calculate KPIs
          const totalApplications = rows.length
          const completed = rows.filter((r) => (r.content ?? '').length > 1000).length
          const inProgress = totalApplications - completed

          // Calculate potential value (sum of max amounts where present)
          const potentialValueNumber = rows.reduce((sum, r) => {
            const meta = (r.metadata ?? {}) as any
            const amountMax = Number(meta.amount_max ?? meta.amount_min ?? 0)
            return sum + (Number.isFinite(amountMax) ? amountMax : 0)
          }, 0)

          const applications = rows.map((r) => {
            const meta = (r.metadata ?? {}) as any
            const contentLength = (r.content ?? '').length
            const isSubmitted = contentLength > 2000 // simple heuristic for demo
            const progress = Math.min(100, Math.round((contentLength / 2000) * 100))

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

            return {
              id: r.scholarship_id,
              draftId: r.draft_id,
              name: r.scholarship_name,
              provider,
              deadline: deadlineLabel,
              status: isSubmitted ? 'Submitted' : 'In Progress',
              progress,
              readiness: progress > 80 ? 'High' : progress > 40 ? 'Medium' : 'Low',
              nextAction: isSubmitted ? 'Wait for Decision' : 'Continue Drafting',
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
