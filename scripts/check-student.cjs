// Quick helper to verify onboarding persisted a student profile.
// Usage: node scripts/check-student.cjs [student_id]
const { Pool } = require('pg')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to run this script.')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const studentId = process.argv[2]

  const sql = studentId
    ? `select id, name, gpa, major, country, metadata, created_at
       from students
       where id = $1::uuid`
    : `select id, name, gpa, major, country, metadata, created_at
       from students
       order by created_at desc
       limit 5`

  try {
    const res = await pool.query(sql, studentId ? [studentId] : [])
    console.log(JSON.stringify(res.rows, null, 2))
  } catch (e) {
    console.error('Query failed:', e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

void main()
