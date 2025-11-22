import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function removeDuplicates() {
  const client = await pool.connect()
  
  try {
    console.log('Finding duplicate scholarships...')
    
    // First, find duplicates based on name
    const duplicatesQuery = `
      SELECT name, COUNT(*) as count, ARRAY_AGG(id ORDER BY id) as ids
      FROM scholarships
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `
    
    const duplicates = await client.query(duplicatesQuery)
    
    if (duplicates.rows.length === 0) {
      console.log('No duplicates found!')
      return
    }
    
    console.log(`Found ${duplicates.rows.length} sets of duplicates:`)
    duplicates.rows.forEach(row => {
      console.log(`  - "${row.name}": ${row.count} copies`)
    })
    
    console.log('\nStarting deletion...')
    
    await client.query('BEGIN')
    
    let totalDeleted = 0
    
    for (const row of duplicates.rows) {
      const idsToDelete = row.ids.slice(1) // Keep the first (oldest) one
      
      // Delete from scholarship_rubrics first (foreign key constraint)
      const rubricResult = await client.query(
        `DELETE FROM scholarship_rubrics WHERE scholarship_id = ANY($1::uuid[])`,
        [idsToDelete]
      )
      
      // Delete from scholarship_embeddings
      const embeddingResult = await client.query(
        `DELETE FROM scholarship_embeddings WHERE scholarship_id = ANY($1::uuid[])`,
        [idsToDelete]
      )
      
      // Delete from scholarships
      const scholarshipResult = await client.query(
        `DELETE FROM scholarships WHERE id = ANY($1::uuid[])`,
        [idsToDelete]
      )
      
      console.log(`  ✓ Deleted ${scholarshipResult.rowCount} duplicate(s) of "${row.name}"`)
      totalDeleted += scholarshipResult.rowCount || 0
    }
    
    await client.query('COMMIT')
    
    console.log(`\n✅ Successfully deleted ${totalDeleted} duplicate scholarships!`)
    
    // Show final counts
    const finalCount = await client.query('SELECT COUNT(*) FROM scholarships')
    const finalRubricCount = await client.query('SELECT COUNT(*) FROM scholarship_rubrics')
    
    console.log('\nFinal counts:')
    console.log(`  Scholarships: ${finalCount.rows[0].count}`)
    console.log(`  Rubrics: ${finalRubricCount.rows[0].count}`)
    
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Error removing duplicates:', e)
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

removeDuplicates().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
