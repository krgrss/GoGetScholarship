
import { pool } from '../src/server/db'

async function main() {
  console.log('Checking database schema...')
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    console.log('Tables:', res.rows.map(r => r.table_name))

    const rubricTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'scholarship_rubrics'
    `)
    console.log('Scholarship Rubrics Columns:', rubricTable.rows)

  } catch (e) {
    console.error('Error checking schema:', e)
  } finally {
    await pool.end()
  }
}

main()
