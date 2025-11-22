
import 'dotenv/config'
import { pool } from '../src/server/db'

async function main() {
  console.log('Migrating rubrics table...')
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scholarship_rubrics (
        scholarship_id UUID PRIMARY KEY,
        rubric JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    console.log('Table scholarship_rubrics created or already exists.')
  } catch (e) {
    console.error('Migration failed:', e)
  } finally {
    await pool.end()
  }
}

main()
