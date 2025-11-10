import { ENV } from './env'
import pg from 'pg'

export const pool = new pg.Pool({ connectionString: ENV.DATABASE_URL })

export async function dbHealth(): Promise<{ ok: boolean }> {
  const r = await pool.query('select 1 as ok')
  return { ok: r.rows?.length > 0 }
}

/** Cosine distance query with pgvector */
export async function topKByEmbedding(
  queryEmbedding: number[],
  k: number,
  minGpa: number | null = null,
) {
  const params: any[] = [JSON.stringify(queryEmbedding), k]
  let where = ''
  if (minGpa !== null) {
    where = 'where s.min_gpa <= $3'
    params.push(minGpa)
  }

  // Use cosine distance operator `<=>` and HNSW index on vector_cosine_ops
  // (see pgvector docs) 
  const sql = `
    select s.id, s.name, s.url, s.min_gpa,
           (e.embedding <=> $1::vector) as distance
    from scholarships s
    join scholarship_embeddings e on e.scholarship_id = s.id
    ${where}
    order by e.embedding <=> $1::vector
    limit $2;
  `
  const r = await pool.query(sql, params)
  return r.rows
}
