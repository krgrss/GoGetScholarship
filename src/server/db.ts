/**
 * Database utilities: shared Postgres connection pool and vector search helpers.
 * - `pool`: shared pg.Pool sourced from ENV.DATABASE_URL (reuse across modules).
 * - `dbHealth()`: basic connectivity probe.
 * - `topKByEmbedding()`: negative inner product (pgvector `<#>`) nearest neighbours over scholarships.
 *    - Returns both `distance` and `dot_sim` = -(distance).
 *    - Applies GPA filter when provided but allows NULL `min_gpa` (treated as no minimum).
 */
import { ENV } from './env'
import pg from 'pg'

export const pool = new pg.Pool({ connectionString: ENV.DATABASE_URL })

export async function dbHealth(): Promise<{ ok: boolean }> {
  /**
   * Check Postgres connectivity.
   * @returns Promise resolving to `{ ok: true }` if a trivial query succeeds.
   */
  const r = await pool.query('select 1 as ok')
  return { ok: r.rows?.length > 0 }
}

/** Negative inner product (dot product) distance query with pgvector */
export async function topKByEmbedding(
  queryEmbedding: number[],
  k: number,
  minGpa: number | null = null,
) {
  /**
   * Perform a kNN search using pgvector negative inner product distance.
   * @param queryEmbedding Embedding of the query text (length = ENV.EMBED_DIM)
   * @param k Number of neighbors (limit)
   * @param minGpa Optional minimum GPA requirement to honor (NULL in DB is treated as no minimum)
   * @returns Rows with `{ id, name, url, min_gpa, distance, dot_sim }`
   */
  const params: any[] = [JSON.stringify(queryEmbedding), k, minGpa]

  // Use negative inner product operator `<#>` and HNSW index on vector_ip_ops
  // (see pgvector docs)
  const sql = `
    select s.id, s.name, s.url, s.min_gpa,
           (e.embedding <#> $1::vector) as distance,
           -(e.embedding <#> $1::vector) as dot_sim
    from scholarships s
    join scholarship_embeddings e on e.scholarship_id = s.id
    where ($3::numeric is null or s.min_gpa is null or s.min_gpa <= $3)
    order by e.embedding <#> $1::vector
    limit $2;
  `
  const r = await pool.query(sql, params)
  return r.rows
}
