
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pool } from '@/server/db'


export const Route = createFileRoute('/api/dashboard')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const student_id = url.searchParams.get('student_id')

        if (!student_id) {
          return new Response(JSON.stringify({ ok: false, error: 'Missing student_id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          // Fetch drafts joined with scholarships
          // We treat every draft as an "Application" in progress or completed
          const sql = `
            SELECT 
              d.id as draft_id,
              d.updated_at,
              d.content,
              s.id as scholarship_id,
              s.name as scholarship_name,
              s.provider,
              s.deadline,
              s.amount
            FROM drafts d
            JOIN scholarships s ON d.scholarship_id = s.id
            WHERE d.student_id = $1
            ORDER BY d.updated_at DESC
          `
          
          const result = await pool.query(sql, [student_id])
          const rows = result.rows

          // Calculate KPIs
          const totalApplications = rows.length
          // Simple heuristic: if content length > 1000 chars, it's "Completed" (or close to it), else "In Progress"
          // In a real app, we'd have a status column.
          const completed = rows.filter(r => r.content && r.content.length > 1000).length
          const inProgress = totalApplications - completed
          
          // Calculate potential value (sum of amounts for all applications)
          const potentialValue = rows.reduce((sum, r) => sum + (r.amount || 0), 0)

          // Map rows to frontend Application type
          const applications = rows.map(r => {
            const contentLength = r.content ? r.content.length : 0
            const isSubmitted = contentLength > 2000 // Mock logic for "Submitted"
            const progress = Math.min(100, Math.round((contentLength / 2000) * 100))
            
            return {
              id: r.scholarship_id, // Use scholarship ID for navigation
              draftId: r.draft_id,
              name: r.scholarship_name,
              provider: r.provider || 'Unknown Provider',
              deadline: r.deadline ? new Date(r.deadline).toLocaleDateString() : 'No deadline',
              status: isSubmitted ? 'Submitted' : 'In Progress',
              progress: progress,
              readiness: progress > 80 ? 'High' : progress > 40 ? 'Medium' : 'Low',
              nextAction: isSubmitted ? 'Wait for Decision' : 'Continue Drafting',
            }
          })

          return new Response(JSON.stringify({
            ok: true,
            kpi: {
              total: totalApplications,
              inProgress,
              completed,
              potentialValue: `$${potentialValue.toLocaleString()}`
            },
            applications
          }), {
            headers: { 'Content-Type': 'application/json' },
          })

        } catch (error) {
          console.error('Dashboard API Error:', error)
          return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
