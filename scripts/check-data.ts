import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkData() {
  try {
    const scholarships = await pool.query('SELECT COUNT(*) FROM scholarships')
    const rubrics = await pool.query('SELECT COUNT(*) FROM scholarship_rubrics')
    const students = await pool.query('SELECT COUNT(*) FROM students')
    
    console.log('Scholarships count:', scholarships.rows[0].count)
    console.log('Rubrics count:', rubrics.rows[0].count)
    console.log('Students count:', students.rows[0].count)
  } catch (e) {
    console.error('Error checking data:', e)
  } finally {
    await pool.end()
  }
}

checkData()
