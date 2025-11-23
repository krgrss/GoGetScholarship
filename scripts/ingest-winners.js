import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'

function usage() {
  console.log(
    [
      'Usage:',
      '  DATABASE_URL=... node scripts/ingest-winners.js data/winners.jsonl',
      '',
      'Notes:',
      '  - winners.jsonl: one JSON object per line with { scholarship_id, year?, winner_name?, story_excerpt?, themes?, angle?, source_url? }.',
      '  - This script matches scholarships by metadata.id or id.',
      '  - It upserts into scholarship_winners and can optionally derive simple winner_patterns.',
    ].join('\n'),
  )
}

function parseJsonl(raw) {
  const seen = new Set()
  return raw
    .split(/\r?\n/)
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.trim() && !line.trim().startsWith('#'))
    .map(({ line, idx }) => {
      try {
        return JSON.parse(line)
      } catch (e) {
        throw new Error(`Failed to parse JSONL at line ${idx + 1}: ${e}`)
      }
    })
    .filter((rec) => {
      // de-dupe identical scholarship_id + winner_name + year rows before hitting the DB
      const key = [rec.scholarship_id ?? '', rec.winner_name ?? '', rec.year ?? ''].join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function groupByScholarshipId(records) {
  const map = new Map()
  for (const r of records) {
    const key = String(r.scholarship_id ?? '').trim()
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return map
}

function derivePatterns(winners) {
  const themeCounts = new Map()
  const angles = new Set()
  for (const w of winners) {
    const themes = Array.isArray(w.themes) ? w.themes : []
    themes.forEach((t) => {
      const key = String(t).toLowerCase()
      themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1)
    })
    if (w.angle) angles.add(String(w.angle))
  }
  const key_themes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t)
  const success_patterns = key_themes.map((t) => `Highlight ${t} with concrete impact and results`)
  if (angles.size) success_patterns.push(`Show a clear ${[...angles].join(', ')} angle`)
  const winner_profile = key_themes.length
    ? `Typical winners emphasize ${key_themes.join(', ')}${angles.size ? ` and lean into ${[
        ...angles,
      ].join(', ')} angles.` : '.'}`
    : 'Typical winners balance impact, leadership, and reflection.'
  return { success_patterns, key_themes, winner_profile }
}

async function findScholarshipId(client, externalId) {
  const { rows } = await client.query(
    `
    select id
    from scholarships
    where metadata->>'id' = $1
       or id::text = $1
    limit 1
  `,
    [externalId],
  )
  return rows[0]?.id || null
}

async function ensureWinnersTable(client) {
  const { rows } = await client.query(
    `
      select to_regclass('public.scholarship_winners') as reg
    `,
  )
  if (!rows[0]?.reg) {
    throw new Error('scholarship_winners table is missing; run sql/schema.sql first.')
  }
}

async function upsertWinner(client, dbScholarshipId, w) {
  await client.query(
    `
    insert into scholarship_winners (id, scholarship_id, year, winner_name, story_excerpt, themes, angle, source_url)
    values (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7)
    on conflict (scholarship_id, coalesce(winner_name, ''), coalesce(year, 0))
    do update set
      story_excerpt = excluded.story_excerpt,
      themes = excluded.themes,
      angle = excluded.angle,
      source_url = excluded.source_url
  `,
    [
      dbScholarshipId,
      w.year ?? null,
      w.winner_name ?? null,
      w.story_excerpt ?? null,
      Array.isArray(w.themes) ? w.themes : null,
      w.angle ?? null,
      w.source_url ?? null,
    ],
  )
}

async function applyPatterns(client, dbScholarshipId, patterns) {
  await client.query(
    `
      update scholarships
      set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('winner_patterns', $2::jsonb)
      where id = $1::uuid
    `,
    [dbScholarshipId, JSON.stringify(patterns)],
  )
}

async function main() {
  const [, , fileArg] = process.argv
  if (!fileArg) {
    usage()
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
    for (const [externalId, records] of groups.entries()) {
      const client = await pool.connect()
      try {
        await ensureWinnersTable(client)
        const dbId = await findScholarshipId(client, externalId)
        if (!dbId) {
          console.warn(`No scholarship found for id/metadata.id=${externalId}; skipping ${records.length} winners.`)
          continue
        }
        for (const r of records) {
          await upsertWinner(client, dbId, r)
        }
        const patterns = derivePatterns(records)
        await applyPatterns(client, dbId, patterns)
        console.log(`Inserted ${records.length} winners and patterns for scholarship ${externalId} (db id ${dbId}).`)
      } finally {
        client.release()
      }
    }
  } finally {
    await pool.end()
  }

  console.log('Done ingesting winners and applying patterns.')
}

main().catch((err) => {
  console.error('Unexpected error in ingest-winners:', err)
  process.exitCode = 1
})
