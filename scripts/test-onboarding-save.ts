import 'dotenv/config'
import { fetch } from 'undici'

async function testSave() {
  const payload = {
    summary: "Test student summary for debugging.",
    country: "Canada",
    major: "Computer Science",
    gpa: 3.8,
    metadata: {
      source: "test-script"
    }
  }

  console.log('Sending payload:', payload)

  try {
    const res = await fetch('http://localhost:3000/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    console.log('Response status:', res.status)
    console.log('Response body:', text)
  } catch (e) {
    console.error('Fetch error:', e)
  }
}

testSave()
