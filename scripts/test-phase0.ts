import 'dotenv/config'
import { fetch } from 'undici'
import pg from 'pg'
import fs from 'fs'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const BASE_URL = 'http://localhost:3000'
const OUTPUT_FILE = 'test-results.txt'

let output: string[] = []
let passedTests = 0
let totalTests = 0

function log(message: string) {
  console.log(message)
  output.push(message)
}

function logTest(name: string, passed: boolean, details?: string) {
  totalTests++
  if (passed) {
    passedTests++
    log(`✅ ${name}`)
    if (details) log(`   ${details}`)
  } else {
    log(`❌ ${name}`)
    if (details) log(`   ${details}`)
  }
}

async function runTests() {
  log('╔════════════════════════════════════════════════════════════╗')
  log('║        Phase 0 Automated Verification Tests               ║')
  log('╚════════════════════════════════════════════════════════════╝')
  log('')
  
  // Test 1: Database counts
  log('📊 Testing Database State...')
  log('')
  
  try {
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM scholarships) as scholarships,
        (SELECT COUNT(*) FROM scholarship_rubrics) as rubrics,
        (SELECT COUNT(*) FROM scholarship_embeddings) as embeddings,
        (SELECT COUNT(*) FROM students) as students
    `)
    
    const c = counts.rows[0]
    logTest('Scholarships table populated', parseInt(c.scholarships) >= 70, `Count: ${c.scholarships}`)
    logTest('Rubrics table populated', parseInt(c.rubrics) >= 30, `Count: ${c.rubrics}`)
    logTest('Embeddings table populated', parseInt(c.embeddings) >= 70, `Count: ${c.embeddings}`)
    
  } catch (e: any) {
    logTest('Database connection', false, e.message)
  }
  
  // Test 2: Profile API
  log('')
  log('👤 Testing Profile API...')
  log('')
  
  const testProfile = {
    summary: 'Test student for Phase 0 verification',
    gpa: 3.7,
    major: 'Computer Science',
    country: 'Canada',
    gender: 'Female',
    ethnicity: 'Asian',
    level_of_study: 'Undergraduate',
    metadata: { source: 'test-phase0' }
  }
  
  let testStudentId: string | null = null
  
  try {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProfile)
    })
    
    const data = await res.json()
    logTest('Profile API responds', res.ok, `Status: ${res.status}`)
    logTest('Returns student_id', !!data.student_id, data.student_id ? `ID: ${data.student_id.slice(0, 8)}...` : '')
    
    if (data.student_id) {
      testStudentId = data.student_id
      
      // Check database
      const check = await pool.query(
        'SELECT gender, ethnicity, level_of_study FROM students WHERE id = $1',
        [data.student_id]
      )
      logTest('Profile saved to database', check.rows.length > 0)
      logTest('Demographic fields saved', 
        check.rows[0]?.gender === 'Female' && check.rows[0]?.ethnicity === 'Asian',
        `Gender: ${check.rows[0]?.gender}, Ethnicity: ${check.rows[0]?.ethnicity}`)
    }
  } catch (e: any) {
    logTest('Profile API call', false, e.message)
  }
  
  // Test 3: Matches API
  log('')
  log('🎯 Testing Matches API...')
  log('')
  
  try {
    const res = await fetch(`${BASE_URL}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_summary: 'Canadian undergraduate student studying Computer Science',
        k: 20
      })
    })
    
    const data = await res.json()
    logTest('Matches API responds', res.ok, `Status: ${res.status}`)
    logTest('Returns scholarship matches', Array.isArray(data.rows) && data.rows.length > 0, 
      `Count: ${data.rows?.length || 0}`)
    logTest('Matches have scores', data.rows?.[0]?.dot_sim !== undefined,
      data.rows?.[0]?.dot_sim ? `First score: ${data.rows[0].dot_sim.toFixed(4)}` : '')
  } catch (e: any) {
    logTest('Matches API call', false, e.message)
  }
  
  // Test 4: Rubric API
  log('')
  log('📋 Testing Rubric API...')
  log('')
  
  try {
    const rubric = await pool.query(`
      SELECT scholarship_id FROM scholarship_rubrics LIMIT 1
    `)
    
    if (rubric.rows.length > 0) {
      const scholarshipId = rubric.rows[0].scholarship_id
      const res = await fetch(`${BASE_URL}/api/rubric?scholarship_id=${scholarshipId}`)
      const data = await res.json()
      
      logTest('Rubric API responds', res.ok, `Status: ${res.status}`)
      logTest('Returns rubric data', !!data.rubric, 
        Array.isArray(data.rubric) ? `Criteria: ${data.rubric.length}` : '')
    } else {
      logTest('Rubric data available', false, 'No rubrics in database')
    }
  } catch (e: any) {
    logTest('Rubric API call', false, e.message)
  }
  
  // Cleanup
  if (testStudentId) {
    log('')
    log('🧹 Cleanup...')
    try {
      await pool.query('DELETE FROM students WHERE metadata->>\'source\' = \'test-phase0\'')
      log('   Test profile deleted')
    } catch (e) {
      log('   Cleanup warning: ' + e)
    }
  }
  
  // Summary
  log('')
  log('╔════════════════════════════════════════════════════════════╗')
  log('║                    Test Summary                            ║')
  log('╚════════════════════════════════════════════════════════════╝')
  log('')
  log(`   Total Tests: ${totalTests}`)
  log(`   Passed: ${passedTests}`)
  log(`   Failed: ${totalTests - passedTests}`)
  log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  log('')
  
  if (passedTests === totalTests) {
    log('   🎉 ALL TESTS PASSED! Phase 0 is complete.')
  } else if (passedTests / totalTests >= 0.8) {
    log('   ⚠️  Most tests passed, but some issues need attention.')
  } else {
    log('   ❌ Multiple failures detected. Review errors above.')
  }
  log('')
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'))
  log(`Results saved to: ${OUTPUT_FILE}`)
  
  await pool.end()
  return passedTests === totalTests
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
