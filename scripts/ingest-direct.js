import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fetch } from 'undici'
import pg from 'pg'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'

dotenv.config()

const { Pool } = pg

async function embedWithVoyage(texts) {
  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('VOYAGE_API_KEY missing')
  
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: 'voyage-3', output_dimension: 1024 }),
  })
  
  if (!res.ok) {
    throw new Error(`Voyage error: ${res.status} ${await res.text()}`)
  }
  
  const data = await res.json()
  return data.data.map(d => d.embedding)
}

function normalizeGpa(minGpa, gpaScale) {
  if (minGpa == null) return null
  if (!gpaScale || gpaScale === 4) return minGpa
  if (typeof gpaScale === 'number' && gpaScale > 0) {
    const scaled = (minGpa * 4) / gpaScale
    return Number.isFinite(scaled) ? Number(scaled.toFixed(2)) : null
  }
  return null
}

function sanitizeUrl(value) {
  if (!value || typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const mdMatch = trimmed.match(/\((https?:\/\/[^)]+)\)/i)
  let candidate = mdMatch ? mdMatch[1] : trimmed
  if (!/^https?:\/\//i.test(candidate)) return undefined
  return candidate
}

function buildRawText(r) {
  const parts = []
  if (r.description_raw) parts.push(String(r.description_raw).trim())
  if (r.eligibility_raw) parts.push(`Eligibility:\n${String(r.eligibility_raw).trim()}`)
  if (Array.isArray(r.essay_prompts_raw) && r.essay_prompts_raw.length > 0) {
    const prompts = r.essay_prompts_raw.map((p) => String(p).trim()).filter(Boolean)
    if (prompts.length > 0) parts.push(`Essay prompts:\n${prompts.join('\n')}`)
  }
  if (parts.length === 0) {
    if (r.name) parts.push(`Scholarship: ${String(r.name).trim()}`)
    // ... simplified fallback
  }
  const joined = parts.join('\n\n').trim()
  return joined.length > 0 ? joined : 'Scholarship description not provided.'
}

function mapRecordToIngest(r) {
  const rawText = buildRawText(r)
  const minGpa = normalizeGpa(r.min_gpa, r.gpa_scale)
  const boundedRawText = typeof rawText === 'string' && rawText.length > 50_000 ? rawText.slice(0, 50_000) : rawText
  const country = r.source_country || (Array.isArray(r.country_eligibility) && r.country_eligibility.length > 0 ? r.country_eligibility[0] : undefined)
  const fields = Array.isArray(r.fields_of_study) && r.fields_of_study.length > 0 ? r.fields_of_study : undefined
  const url = sanitizeUrl(r.application_url || r.url)
  const metadata = { ...r }
  return {
    name: r.name ?? '(unknown scholarship)',
    sponsor: r.provider_name || undefined,
    url,
    raw_text: boundedRawText,
    min_gpa: minGpa ?? undefined,
    country,
    fields,
    metadata,
  }
}

async function main() {
  const [, , fileArg] = process.argv
  if (!fileArg) {
    console.log('Usage: node scripts/ingest-direct.js <path-to-json>')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  const raw = await fs.readFile(filePath, 'utf8')
  const records = JSON.parse(raw).scholarships || JSON.parse(raw)
  
  console.log(`Ingesting ${records.length} records...`)
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  
  try {
    const scholarships = records.map(mapRecordToIngest)
    
    // Batch in groups of 10 to avoid huge payloads/timeouts
    const BATCH_SIZE = 10
    for (let i = 0; i < scholarships.length; i += BATCH_SIZE) {
      const batch = scholarships.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${i} to ${i + batch.length}...`)
      
      const texts = batch.map(s => s.raw_text)
      const embeddings = await embedWithVoyage(texts)
      
      await client.query('BEGIN')
      for (let j = 0; j < batch.length; j++) {
        const s = batch[j]
        const id = randomUUID()
        await client.query(
          `insert into scholarships
           (id, name, sponsor, url, raw_text, min_gpa, country, fields, metadata)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, s.name, s.sponsor ?? null, s.url ?? null, s.raw_text, s.min_gpa ?? null, s.country ?? null, s.fields ?? null, s.metadata ?? null]
        )
        await client.query(
          `insert into scholarship_embeddings (scholarship_id, embedding)
           values ($1, $2::vector)`,
          [id, JSON.stringify(embeddings[j])]
        )
      }
      await client.query('COMMIT')
    }
    console.log('Done!')
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('Error:', e)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
