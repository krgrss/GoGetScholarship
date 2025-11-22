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
  try {
    const r = await pool.query('select 1 as ok')
    return { ok: r.rows?.length > 0 }
  } catch (e) {
    const fs = await import('node:fs/promises');
    await fs.appendFile('c:/Users/admin/Desktop/GoGetScholarship/my-scholarship-app/server-debug.log', `[${new Date().toISOString()}] DB Health Error: ${e}\nENV.DATABASE_URL present: ${!!ENV.DATABASE_URL}\n`);
    throw e;
  }
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
   * Student's gender identity (e.g., "Woman", "Man", "Non-binary").
   * Used for hard filtering against demographic_eligibility.
   */
  gender?: string
  /**
   * Student's ethnicity (e.g., "Black", "Indigenous").
   * Used for hard filtering.
   */
  ethnicity?: string
  /**
   * List of self-identified demographic tags (e.g. ["first_generation", "lgbtq"]).
   * Used for hard filtering.
   */
  demographicSelf?: string[]
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
    eligibility?.demographicSelf ?? [], // $9 (Array of student's tags)
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
          (s.metadata->>'financial_need_required')::boolean is true
          or s.metadata ? 'financial_need_required' = false
        )
      )
      -- Demographic Eligibility (Hard Filter)
      -- Logic: Include scholarship IF:
      -- 1. It has NO demographic_eligibility field (or is empty/none_specified)
      -- 2. OR The student's tags ($9) overlap with the scholarship's requirements
      -- 3. OR The scholarship's requirements DO NOT contain any "Hard Constraints" that the student lacks.
      --    (We define a list of hard constraints like 'women', 'indigenous', 'black', etc.)
      and (
        not (s.metadata ? 'demographic_eligibility')
        or jsonb_array_length(s.metadata->'demographic_eligibility') = 0
        or s.metadata->'demographic_eligibility' ? 'none_specified'
        -- Student matches at least one requirement
        or (s.metadata->'demographic_eligibility') ?| $9::text[]
        -- Scholarship does NOT have a hard constraint that the student misses
        -- (If scholarship requires 'women' and student is not 'women', exclude.
        --  But if scholarship requires 'leadership' and student is not 'leadership', keep it.)
        or not (
           s.metadata->'demographic_eligibility' ?| array['women', 'female', 'indigenous', 'black', 'african_american', 'hispanic', 'latino', 'lgbtq', 'disability', 'first_generation']
           and not ((s.metadata->'demographic_eligibility') ?| $9::text[])
        )
      )
    order by e.embedding <#> $1::vector
    limit $2;
  `
  const r = await pool.query(sql, params)
  return r.rows
}
