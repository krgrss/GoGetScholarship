/**
 * Voyage embeddings client
 * - Centralized wrapper around `POST /v1/embeddings`.
 * - Defaults to ENV.VOYAGE_MODEL and ENV.EMBED_DIM to match pgvector column.
 * - Includes a fetch timeout for resilience during development.
 */
import { ENV } from '../env'

/**
 * Voyage embeddings with timeout and helpful errors.
 * Uses model/dimension from ENV by default to stay in sync with pgvector.
 */
export async function embedWithVoyage(
  texts: string[],
  model = ENV.VOYAGE_MODEL,
  output_dimension = ENV.EMBED_DIM,
  timeoutMs = 20000,
) {
  /**
   * Create embeddings for a batch of input texts using Voyage.
   * @param texts Array of input strings to embed.
   * @param model Voyage model name (defaults to ENV.VOYAGE_MODEL).
   * @param output_dimension Embedding dimension (defaults to ENV.EMBED_DIM).
   * @param timeoutMs Request timeout in milliseconds (default 20000).
   * @returns Promise resolving to an array of embeddings (number[] per input).
   */
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: texts, model, output_dimension }),
      signal: ctrl.signal,
    })
    if (!r.ok) {
      const t = await r.text()
      throw new Error(`Voyage error: ${r.status} ${t}`)
    }
    const data = await r.json()
    return data.data.map((d: any) => d.embedding as number[])
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Voyage timeout after ${timeoutMs}ms`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}
