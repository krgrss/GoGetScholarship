import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/apply-winner-patterns.js <path-to-winners-jsonl>',
      '',
      'Example:',
      '  DATABASE_URL=... node scripts/apply-winner-patterns.js data/winners.jsonl',
      '',
      'Notes:',
      '  - winners.jsonl must contain one JSON object per line with { scholarship_id, story_excerpt, themes?, angle?, winner_name? }.',
      '  - Scholarships are matched via scholarships.metadata->>id (same ids as scholarships_clean.jsonl).',
      '  - This script does NOT call an LLM; it derives simple patterns from the winners file.',
    ].join('\n'),
  )
}

function parseJsonl(raw) {
  const lines = raw.split(/\r?\n/)
  const records = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue
    try {
      records.push(JSON.parse(line))
    } catch (e) {
      throw new Error(`Failed to parse JSONL line ${i + 1}: ${e}`)
    }
  }
  return records
}

function groupByScholarshipId(records) {
  const groups = new Map()
  for (const r of records) {
    const key = String(r.scholarship_id || '').trim()
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }
  return groups
}

function derivePatterns(winners) {
  const themeCounts = new Map()
  const angles = new Set()
  for (const w of winners) {
    ;(Array.isArray(w.themes) ? w.themes : []).forEach((t) => {
      const key = String(t).toLowerCase()
      themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1)
    })
    if (w.angle) angles.add(String(w.angle))
  }
  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t)

  const success_patterns = []
  for (const t of topThemes) {
    success_patterns.push(`Highlight ${t} with concrete impact and results`)
  }
  if (angles.size) {
    success_patterns.push(`Show clear ${[...angles].join(', ')} angle in your story`)
  }

  const key_themes = topThemes
  const winner_profile = `Typical winners emphasize ${topThemes.join(
    ', ',
  )} and frame their work with angles like ${[...angles].join(', ') || 'leadership/impact'}.`

  return { success_patterns, key_themes, winner_profile }
}

async function applyPatterns({ pool, scholarshipId, patterns }) {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `
        select id from scholarships
        where metadata->>'id' = $1
        limit 1
      `,
      [scholarshipId],
    )
    if (rows.length === 0) {
      console.warn(`No scholarship row found for metadata.id=${scholarshipId}; skipping`)
      return
    }
    const dbId = rows[0].id
    await client.query(
      `
        update scholarships
        set metadata = coalesce(metadata, '{}'::jsonb) || $2::jsonb
        where id = $1::uuid
      `,
      [dbId, JSON.stringify({ winner_patterns: patterns })],
    )
    console.log(`Updated winner_patterns for scholarship metadata.id=${scholarshipId} (db id ${dbId})`)
  } finally {
    client.release()
  }
}

async function main() {
  const [, , fileArg] = process.argv
  if (!fileArg) {
    printUsage()
    process.exitCode = 1
    return
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL must be set')
    process.exitCode = 1
    return
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  const raw = await fs.readFile(filePath, 'utf8')
  const winners = parseJsonl(raw)
  const groups = groupByScholarshipId(winners)
  console.log(`Loaded ${winners.length} winner records across ${groups.size} scholarship ids.`)

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    for (const [scholarshipId, group] of groups.entries()) {
      const patterns = derivePatterns(group)
      await applyPatterns({ pool, scholarshipId, patterns })
    }
  } finally {
    await pool.end()
  }

  console.log('Done applying winner patterns.')
}

main().catch((err) => {
  console.error('Unexpected error in apply-winner-patterns:', err)
  process.exitCode = 1
})
