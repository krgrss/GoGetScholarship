import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkRubrics() {
  console.log('Checking rubric coverage...\n')
  
  try {
    // Get total scholarships
    const totalRes = await pool.query('SELECT COUNT(*) FROM scholarships')
    const total = parseInt(totalRes.rows[0].count)
    
    // Get scholarships with rubrics
    const rubricRes = await pool.query(`
      SELECT 
        s.id,
        s.name,
        jsonb_array_length(sr.rubric) as criterion_count
      FROM scholarships s
      JOIN scholarship_rubrics sr ON s.id = sr.scholarship_id
      ORDER BY s.name
      LIMIT 10
    `)
    
    console.log(`Total scholarships: ${total}`)
    console.log(`Scholarships with rubrics: ${rubricRes.rows.length}\n`)
    
    if (rubricRes.rows.length > 0) {
      console.log('Sample scholarships with rubrics:')
      rubricRes.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.criterion_count} criteria)`)
        console.log(`    ID: ${row.id}`)
      })
    } else {
      console.log('⚠️  No rubrics found! Need to generate them.')
    }
    
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await pool.end()
  }
}

checkRubrics()
