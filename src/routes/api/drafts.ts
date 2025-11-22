
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pool } from '@/server/db'
import { randomUUID } from 'crypto'
import { getStudentIdFromRequest } from '@/server/auth'

const SaveDraftSchema = z.object({
  student_id: z.string().uuid(),
  scholarship_id: z.string().uuid(),
  content: z.string(),
})

export const Route = createFileRoute('/api/drafts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const student_id = url.searchParams.get('student_id') || getStudentIdFromRequest(request)
        const scholarship_id = url.searchParams.get('scholarship_id')

        if (!student_id || !scholarship_id) {
          return new Response(JSON.stringify({ ok: false, error: 'Missing student_id or scholarship_id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const sql = `
            select
              content,
              explanation,
              created_at as updated_at
            from drafts
            where student_id = $1
              and scholarship_id = $2
            order by created_at desc
            limit 1
          `
          const result = await pool.query(sql, [student_id, scholarship_id])
          
          if (result.rows.length === 0) {
            return new Response(JSON.stringify({ ok: true, draft: null }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify({ ok: true, draft: result.rows[0] }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Get Draft API Error:', error)
          return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { student_id, scholarship_id, content } = SaveDraftSchema.parse(body)

          // Check if draft exists
          const checkSql = `SELECT id FROM drafts WHERE student_id = $1 AND scholarship_id = $2`
          const checkResult = await pool.query(checkSql, [student_id, scholarship_id])

          if (checkResult.rows.length > 0) {
            // Update existing content (created_at already reflects first save)
            const updateSql = `
              update drafts
              set content = $1
              where student_id = $2
                and scholarship_id = $3
            `
            await pool.query(updateSql, [content, student_id, scholarship_id])
          } else {
            // Insert new
            const insertSql = `
              INSERT INTO drafts (id, student_id, scholarship_id, kind, content, explanation)
              VALUES ($1, $2, $3, 'manual', $4, '')
            `
            await pool.query(insertSql, [randomUUID(), student_id, scholarship_id, content])
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Save Draft API Error:', error)
          return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
