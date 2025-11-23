import dotenv from 'dotenv';
import { fetch } from 'undici';

dotenv.config();

async function test() {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    console.error('VOYAGE_API_KEY not found in environment');
    process.exit(1);
  }
  // Mask key for logging
  const masked = key.substring(0, 5) + '...' + key.substring(key.length - 4);
  console.log('Testing Voyage API with key:', masked);
  
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: ['test'], model: 'voyage-3', output_dimension: 1024 }),
    });
    
    if (!res.ok) {
      console.error('Error:', res.status, await res.text());
      process.exit(1);
    } else {
      const data = await res.json();
      console.log('Success! Embedding length:', data.data[0].embedding.length);
    }
  } catch (e) {
    console.error('Exception:', e);
    process.exit(1);
  }
}

test();
