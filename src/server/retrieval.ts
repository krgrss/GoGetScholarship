/**
 * Retrieval helpers (pgvector)
 * - `topKScholarships`: negative inner product nearest neighbours over scholarships with optional GPA filter.
 *   Returns rows: { id, name, url, min_gpa, distance, dot_sim }.
 */
import { pool } from './db'

// Returns rows with cosine distance and similarity
export async function topKScholarships(
  queryEmbedding: number[],
  k = 40,
  gpa?: number,
) {
  /**
   * Retrieve the top-K nearest scholarships by cosine distance.
   * @param queryEmbedding Embedding for the student summary.
   * @param k Maximum number of results to return (default 40).
   * @param gpa Optional GPA filter; rows with NULL min_gpa always pass.
   * @returns Rows: `{ id, name, url, min_gpa, distance, cos_sim }[]`.
   */
  const client = await pool.connect()
  try {
    const sql = `
      SELECT s.id, s.name, s.url, s.min_gpa,
             (e.embedding <#> $1::vector) AS distance,
             -(e.embedding <#> $1::vector) AS dot_sim
      FROM scholarships s
      JOIN scholarship_embeddings e
        ON e.scholarship_id = s.id
      WHERE ($2::numeric IS NULL OR s.min_gpa IS NULL OR s.min_gpa <= $2)
      ORDER BY e.embedding <#> $1::vector
      LIMIT $3
    `
    const { rows } = await client.query(sql, [JSON.stringify(queryEmbedding), gpa ?? null, k])
    return rows
  } finally {
    client.release()
  }
}
