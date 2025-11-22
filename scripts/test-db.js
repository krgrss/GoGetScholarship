
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const { Pool } = pg;

async function testDb() {
  console.log('Testing DB connection...');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing from env');
    process.exit(1);
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    console.log('Connected to DB successfully');
    const res = await client.query('SELECT NOW()');
    console.log('DB Time:', res.rows[0]);
    client.release();
    await pool.end();
    console.log('Pool closed');
  } catch (e) {
    console.error('DB Connection Failed:', e);
    process.exit(1);
  }
}

testDb();
