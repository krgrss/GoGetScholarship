import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pg from 'pg'
import Anthropic from '@anthropic-ai/sdk'

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/mine-winner-patterns.js <path-to-winners-jsonl>',
      '',
      'Example:',
      '  ANTHROPIC_API_KEY=... DATABASE_URL=... node scripts/mine-winner-patterns.js data/winners.jsonl',
      '',
      'Notes:',
      '  - winners.jsonl must contain one JSON object per line with at least { scholarship_id, story_excerpt }.',
      '  - Scholarships are matched via scholarships.metadata->>id = winners.scholarship_id (from data/scholarships*.json[l]).',
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
    if (!r.scholarship_id) continue
    const key = String(r.scholarship_id)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(r)
  }
  return groups
}

function buildWinnerText(winners) {
  return winners
    .map((w) => {
      const name = w.winner_name ? String(w.winner_name) : 'winner'
      const excerpt = w.story_excerpt ? String(w.story_excerpt) : ''
      const themes = Array.isArray(w.themes) ? w.themes.join(', ') : ''
      const angle = w.angle ? String(w.angle) : ''
      return [
        `Winner: ${name}`,
        angle ? `Angle: ${angle}` : '',
        themes ? `Themes: ${themes}` : '',
        excerpt ? `Story: ${excerpt}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n---\n\n')
}

function extractJson(text) {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON object found in Claude output')
  }
  const slice = text.slice(first, last + 1)
  return JSON.parse(slice)
}

async function minePatternsForScholarship({ pool, anthropic, scholarshipId, winners }) {
  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      `
        select id, name, raw_text, metadata
        from scholarships
        where metadata->>'id' = $1
        limit 1
      `,
      [scholarshipId],
    )

    if (rows.length === 0) {
      console.warn(`No scholarship row found for metadata.id = ${scholarshipId}; skipping`)
      return
    }

    const row = rows[0]
    const dbId = row.id
    const name = row.name
    const rawText = row.raw_text || ''
    const metadata = row.metadata || {}
    const descriptionRaw = metadata.description_raw || ''
    const eligibilityRaw = metadata.eligibility_raw || ''

    const winnerText = buildWinnerText(winners)

    const system =
      'You are an expert scholarship consultant. ' +
      'Analyze the scholarship description and winner stories to infer what winning applications tend to emphasize. ' +
      'Output ONLY minified JSON matching the schema.'

    const userPrompt = `
Analyze this scholarship and its winner stories and return EXACTLY this JSON (no prose, no markdown):
{
  "success_patterns": ["pattern1", "pattern2", "pattern3"],
  "key_themes": ["theme1", "theme2", "theme3"],
  "winner_profile": "A short paragraph describing the ideal candidate."
}

Definitions:
- success_patterns: Actionable advice on what to emphasize (e.g., "Quantify long-term community service", "Show initiative in creating new programs").
- key_themes: Core values that appear repeatedly in criteria AND winner stories (e.g., "Resilience", "STEM innovation").
- winner_profile: A concise persona of a typical winner (background, activities, motivations), grounded ONLY in the info below.

SCHOLARSHIP:
- Name: ${name}

DESCRIPTION_RAW:
${String(descriptionRaw).slice(0, 2000)}

ELIGIBILITY_RAW:
${String(eligibilityRaw).slice(0, 1500)}

RAW_TEXT (truncated):
${String(rawText).slice(0, 3000)}

WINNER STORIES (summaries and excerpts):
${winnerText}
`.trim()

    const res = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = res.content?.[0]?.type === 'text' ? res.content[0].text : ''
    if (!content) {
      throw new Error('Empty response from Claude')
    }

    const parsed = extractJson(content)
    if (
      !parsed ||
      !Array.isArray(parsed.success_patterns) ||
      !Array.isArray(parsed.key_themes) ||
      typeof parsed.winner_profile !== 'string'
    ) {
      throw new Error('Parsed JSON does not match expected shape')
    }

    const winnerPatterns = {
      success_patterns: parsed.success_patterns,
      key_themes: parsed.key_themes,
      winner_profile: parsed.winner_profile,
    }

    await client.query(
      `
        update scholarships
        set metadata = coalesce(metadata, '{}'::jsonb) || $2::jsonb
        where id = $1::uuid
      `,
      [dbId, JSON.stringify({ winner_patterns: winnerPatterns })],
    )

    console.log(`Updated winner_patterns for scholarship metadata.id=${scholarshipId}, db id=${dbId}`)
  } catch (e) {
    console.error(`Error processing scholarship_id=${scholarshipId}:`, e)
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  const dbUrl = process.env.DATABASE_URL
  if (!apiKey || !dbUrl) {
    console.error('ERROR: ANTHROPIC_API_KEY and DATABASE_URL must be set in the environment.')
    process.exitCode = 1
    return
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  const raw = await fs.readFile(filePath, 'utf8')
  const winners = parseJsonl(raw)
  if (!winners.length) {
    console.error('No winner records found in file.')
    process.exitCode = 1
    return
  }

  const groups = groupByScholarshipId(winners)
  console.log(`Loaded ${winners.length} winner records across ${groups.size} scholarship_id group(s).`)

  const pool = new pg.Pool({ connectionString: dbUrl })
  const anthropic = new Anthropic({ apiKey })

  try {
    for (const [scholarshipId, group] of groups.entries()) {
      console.log(`\n=== Mining patterns for scholarship_id=${scholarshipId} (winners: ${group.length}) ===`)
      await minePatternsForScholarship({ pool, anthropic, scholarshipId, winners: group })
    }
  } finally {
    await pool.end()
  }

  console.log('\nDone mining winner patterns.')
}

main().catch((err) => {
  console.error('Unexpected error in mine-winner-patterns script:', err)
  process.exitCode = 1
})

