import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function migrate() {
  const client = await pool.connect()
  
  try {
    console.log('Adding demographic fields to students table...')
    
    const sql = fs.readFileSync('scripts/add-demographic-fields.sql', 'utf8')
    
    await client.query(sql)
    
    console.log('✅ Migration complete!')
    console.log('Added fields: gender, date_of_birth, ethnicity, level_of_study')
    
  } catch (e) {
    console.error('Migration error:', e)
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
