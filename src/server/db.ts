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

export type EligibilityFilter = {
  /**
   * Student's country of study/residence (e.g., "CA").
   * Used against scholarships.country, metadata.source_country,
   * and metadata.country_eligibility[] when present.
   */
  country?: string
  /**
   * Student's level of study (e.g., "high_school", "undergrad").
   * Matched against metadata.level_of_study[].
   */
  levelOfStudy?: string
  /**
   * Student's field(s) of study (e.g., ["STEM","engineering"]).
   * Matched against scholarships.fields and metadata.fields_of_study[].
   */
  fieldsOfStudy?: string[]
  /**
   * Student's citizenship status (e.g., "canadian_citizen").
   * Matched against metadata.citizenship_requirements[].
   */
  citizenship?: string
  /**
   * Whether the student reports significant financial need.
   * If true, prefer scholarships that require need when that flag is set.
   */
  hasFinancialNeed?: boolean
  /**
   * Student's self-identified gender (e.g., "woman", "man", "nonbinary").
   * Used to enforce hard demographic requirements like `women_only`.
   */
  gender?: string
}

/** Negative inner product (dot product) distance query with pgvector */
export async function topKByEmbedding(
  queryEmbedding: number[],
  k: number,
  minGpa: number | null = null,
  eligibility?: EligibilityFilter,
) {
  /**
   * Perform a kNN search using pgvector negative inner product distance.
   * @param queryEmbedding Embedding of the query text (length = ENV.EMBED_DIM)
   * @param k Number of neighbors (limit)
   * @param minGpa Optional minimum GPA filter; scholarships with NULL min_gpa always pass.
   * @param eligibility Optional structured eligibility filter applied via SQL/JSONB.
   * @returns Rows with `{ id, name, url, min_gpa, distance, dot_sim }`
   */
  const params: any[] = [
    JSON.stringify(queryEmbedding), // $1
    k, // $2
    minGpa, // $3
    eligibility?.country ?? null, // $4
    eligibility?.levelOfStudy ?? null, // $5
    eligibility?.fieldsOfStudy ?? null, // $6
    eligibility?.citizenship ?? null, // $7
    typeof eligibility?.hasFinancialNeed === 'boolean' ? eligibility.hasFinancialNeed : null, // $8
    eligibility?.gender ?? null, // $9
  ]

  // Use negative inner product operator `<#>` and HNSW index on vector_ip_ops
  // (see pgvector docs). Hard filters are applied using both top-level columns
  // and metadata JSON where applicable.
  const sql = `
    select s.id, s.name, s.url, s.min_gpa,
           (e.embedding <#> $1::vector) as distance,
           -(e.embedding <#> $1::vector) as dot_sim
    from scholarships s
    join scholarship_embeddings e on e.scholarship_id = s.id
    where
      -- GPA filter: only include scholarships whose min_gpa is <= requested,
      -- but always allow NULL min_gpa
      ($3::numeric is null or s.min_gpa is null or s.min_gpa <= $3)
      -- Country filter: match top-level or metadata country fields
      and (
        $4::text is null
        or s.country = $4::text
        or (s.metadata->>'source_country') = $4::text
        or (
          s.metadata ? 'country_eligibility'
          and s.metadata->'country_eligibility' ? $4::text
        )
      )
      -- Level of study: ensure student's level appears in metadata.level_of_study[]
      and (
        $5::text is null
        or (
          s.metadata ? 'level_of_study'
          and s.metadata->'level_of_study' ? $5::text
        )
      )
      -- Field(s) of study: overlap against scholarships.fields or metadata.fields_of_study[]
      and (
        $6::text[] is null
        or (s.fields is not null and s.fields && $6::text[])
        or (
          s.metadata ? 'fields_of_study'
          and (s.metadata->'fields_of_study') ?| $6::text[]
        )
      )
      -- Citizenship requirements
      and (
        $7::text is null
        or (
          s.metadata ? 'citizenship_requirements'
          and s.metadata->'citizenship_requirements' ? $7::text
        )
      )
      -- Financial need: if student has need, prefer scholarships that either
      -- require need or do not specify; if student does not, allow all.
      and (
        $8::boolean is null
        or $8::boolean = false
        or (
          -- Either the scholarship explicitly requires need...
          (s.metadata ? 'financial_need_required'
           and (s.metadata->>'financial_need_required')::boolean is true)
          -- ...or it does not specify this flag at all.
          or not (s.metadata ? 'financial_need_required')
        )
      )
      -- Demographic hard filters (gender-based examples)
      and (
        $9::text is null
        or not (
          s.metadata ? 'demographic_eligibility'
          and (
            -- Scholarship requires women but student does not identify as a woman
            (
              $9::text in ('man', 'male')
              and (
                (s.metadata->'demographic_eligibility') ? 'women_only'
                or (s.metadata->'demographic_eligibility') ? 'women'
              )
            )
            -- Scholarship requires men but student does not identify as a man
            or (
              $9::text in ('woman', 'female')
              and (s.metadata->'demographic_eligibility') ? 'men_only'
            )
          )
        )
      )
    order by e.embedding <#> $1::vector
    limit $2;
  `
  const r = await pool.query(sql, params)
  return r.rows
}
