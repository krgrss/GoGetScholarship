import { fetch } from 'undici';

async function check() {
  try {
    console.log('Checking http://localhost:3001/api/db-health ...');
    const res = await fetch('http://localhost:3001/api/db-health');
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch (e) {
    console.error('Failed:', e.message);
  }
}

check();
