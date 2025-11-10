import { ENV } from '../env'

// Voyage embeddings endpoint reference (POST /v1/embeddings) 
export async function embedWithVoyage(texts: string[], model = 'voyage-3.5', output_dimension = 1024) {
  const r = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model,
      output_dimension, // shrink or grow per your pgvector column
    }),
  })

  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Voyage error: ${r.status} ${t}`)
  }
  const data = await r.json()
  // Response contains data: [{ embedding: number[] }, ...]
  return data.data.map((d: any) => d.embedding as number[])
}
