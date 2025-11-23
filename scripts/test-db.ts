
import { pool } from '../src/server/db';

async function testDb() {
  console.log('Testing DB connection...');
  try {
    const client = await pool.connect();
    console.log('Connected to DB');
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
