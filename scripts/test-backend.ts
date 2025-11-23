
import { pool, dbHealth } from '../src/server/db'
import { embedWithVoyage } from '../src/server/embeddings/voyage'
import { ENV } from '../src/server/env'

async function main() {
  console.log('Testing Backend Connectivity...')
  
  // 1. Test DB
  try {
    console.log('Checking DB health...')
    const health = await dbHealth()
    console.log('DB Health:', health)
  } catch (e) {
    console.error('DB Health Failed:', e)
  }

  // 2. Test Voyage
  try {
    console.log('Testing Voyage Embeddings...')
    console.log('API Key present:', !!ENV.VOYAGE_API_KEY)
    const embedding = await embedWithVoyage(['Hello world'])
    console.log('Voyage Success! Embedding length:', embedding[0].length)
  } catch (e) {
    console.error('Voyage Failed:', e)
  }

  await pool.end()
}

main().catch(console.error)
