// src/server/retrieval.ts
import { Pool } from "pg";
import { ENV } from "./env";

const pool = new Pool({ connectionString: ENV.DATABASE_URL });

// Returns {id, name, distance, cos_sim}
export async function topKScholarships(
  queryEmbedding: number[],
  k = 40,
  gpa?: number
) {
  const client = await pool.connect();
  try {
    const sql = `
      SELECT s.id, s.name,
             (e.embedding <#> $1::vector) AS distance,
             1 - (e.embedding <#> $1::vector) AS cos_sim
      FROM scholarships s
      JOIN scholarship_embeddings e
        ON e.scholarship_id = s.id
      WHERE ($2::numeric IS NULL OR s.min_gpa <= $2)
      ORDER BY e.embedding <#> $1::vector
      LIMIT $3
    `;
    const { rows } = await client.query(sql, [queryEmbedding, gpa ?? null, k]);
    return rows;
  } finally {
    client.release();
  }
}
