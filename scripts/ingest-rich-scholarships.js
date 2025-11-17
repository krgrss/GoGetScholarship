import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fetch } from 'undici'

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/ingest-rich-scholarships.js <path-to-json> [ingest-url]',
      '',
      'Examples:',
      '  ADMIN_API_KEY=your-key node scripts/ingest-rich-scholarships.js data/scholarships.json',
      '  ADMIN_API_KEY=your-key node scripts/ingest-rich-scholarships.js data/scholarships.json http://localhost:3000/api/ingest',
      '',
      'Notes:',
      '  - JSON can be a single object, an array of objects, or { "scholarships": [...] }.',
      '  - ADMIN_API_KEY must be set in the environment to call the protected /api/ingest route.',
    ].join('\n'),
  )
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

  // Handle Markdown-style [text](https://example.com) by extracting the URL in parentheses
  const mdMatch = trimmed.match(/\((https?:\/\/[^)]+)\)/i)
  let candidate = mdMatch ? mdMatch[1] : trimmed

  // Only accept absolute HTTP(S) URLs; otherwise, drop it
  if (!/^https?:\/\//i.test(candidate)) return undefined

  return candidate
}

function buildRawText(r) {
  const parts = []
  if (r.description_raw) {
    parts.push(String(r.description_raw).trim())
  }
  if (r.eligibility_raw) {
    parts.push(`Eligibility:\n${String(r.eligibility_raw).trim()}`)
  }
  if (Array.isArray(r.essay_prompts_raw) && r.essay_prompts_raw.length > 0) {
    const prompts = r.essay_prompts_raw.map((p) => String(p).trim()).filter(Boolean)
    if (prompts.length > 0) {
      parts.push(`Essay prompts:\n${prompts.join('\n')}`)
    }
  }

  // Fallback: if no longform text fields are present, synthesize a short description
  if (parts.length === 0) {
    const fallback = []
    if (r.name) {
      fallback.push(`Scholarship: ${String(r.name).trim()}`)
    }
    if (r.provider_name) {
      fallback.push(`Provider: ${String(r.provider_name).trim()}`)
    }
    const countries =
      r.source_country ||
      (Array.isArray(r.country_eligibility) && r.country_eligibility.length > 0
        ? r.country_eligibility.join(', ')
        : null)
    if (countries) {
      fallback.push(`Country eligibility: ${countries}`)
    }
    if (Array.isArray(r.level_of_study) && r.level_of_study.length > 0) {
      fallback.push(`Level of study: ${r.level_of_study.join(', ')}`)
    }
    if (Array.isArray(r.fields_of_study) && r.fields_of_study.length > 0) {
      fallback.push(`Fields of study: ${r.fields_of_study.join(', ')}`)
    }
    if (r.application_effort) {
      fallback.push(`Application effort: ${String(r.application_effort).trim()}`)
    }
    if (fallback.length > 0) {
      parts.push(fallback.join('\n'))
    }
  }

  const joined = parts.join('\n\n').trim()
  // Ensure we always return a non-empty string for embedding
  return joined.length > 0 ? joined : 'Scholarship description not provided.'
}

function mapRecordToIngest(r) {
  const rawText = buildRawText(r)

  const minGpa = normalizeGpa(r.min_gpa, r.gpa_scale)
  const boundedRawText =
    typeof rawText === 'string' && rawText.length > 50_000 ? rawText.slice(0, 50_000) : rawText

  const country =
    r.source_country ||
    (Array.isArray(r.country_eligibility) && r.country_eligibility.length > 0
      ? r.country_eligibility[0]
      : undefined)

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
  const [, , fileArg, ingestUrlArg] = process.argv

  if (!fileArg) {
    printUsage()
    process.exitCode = 1
    return
  }

  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    console.error('ERROR: ADMIN_API_KEY must be set in the environment.')
    process.exitCode = 1
    return
  }

  const ingestUrl = ingestUrlArg || 'http://localhost:3000/api/ingest'

  const filePath = path.resolve(process.cwd(), fileArg)
  const raw = await fs.readFile(filePath, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error('ERROR: Failed to parse JSON file:', e)
    process.exitCode = 1
    return
  }

  let records
  if (Array.isArray(parsed)) {
    records = parsed
  } else if (parsed && Array.isArray(parsed.scholarships)) {
    records = parsed.scholarships
  } else {
    records = [parsed]
  }

  if (records.length === 0) {
    console.error('No records found to ingest.')
    process.exitCode = 1
    return
  }

  console.log(`Mapping ${records.length} record(s) to /api/ingest payload...`)

  const scholarships = records.map(mapRecordToIngest)

  const payload = { scholarships }

  console.log(`POST ${ingestUrl} with ${scholarships.length} scholarship(s)...`)

  const res = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error('Non-JSON response from server:', text)
    process.exitCode = res.ok ? 0 : 1
    return
  }

  if (!res.ok || !json.ok) {
    console.error('Ingest failed:', json)
    process.exitCode = 1
    return
  }

  console.log('Ingest succeeded:', json)
}

main().catch((err) => {
  console.error('Unexpected error during ingest:', err)
  process.exitCode = 1
})
