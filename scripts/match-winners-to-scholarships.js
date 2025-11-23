/**
 * Helper to align winner scholarship_ids with scholarships_clean.jsonl.
 *
 * Usage:
 *   node scripts/match-winners-to-scholarships.js data/winners.jsonl data/scholarships_clean.jsonl
 *
 * Behavior:
 * - Loads winners and scholarships (JSONL).
 * - Flags winners whose scholarship_id is missing in the scholarships set.
 * - For each missing winner, suggests candidates by simple slug heuristics:
 *     * exact id match
 *     * id match after stripping trailing -YYYY or -YYYY-<extra>
 *     * startsWith base slug
 * - Prints a report to stdout; does NOT modify files.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

function parseJsonl(raw) {
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
}

function baseSlug(slug) {
  if (!slug) return ''
  // remove trailing year-ish suffixes like -2025, -2025-ug, -2025-hs
  return String(slug)
    .replace(/-20\d{2}([a-z-]+)?$/i, '')
    .trim()
}

async function main() {
  const [, , winnersArg = 'data/winners.jsonl', scholarshipsArg = 'data/scholarships_clean.jsonl'] = process.argv
  const winnersPath = path.resolve(process.cwd(), winnersArg)
  const scholarshipsPath = path.resolve(process.cwd(), scholarshipsArg)

  const [winnersRaw, scholarshipsRaw] = await Promise.all([
    fs.readFile(winnersPath, 'utf8'),
    fs.readFile(scholarshipsPath, 'utf8'),
  ])

  const winners = parseJsonl(winnersRaw)
  const scholarships = parseJsonl(scholarshipsRaw)

  const scholById = new Map()
  const scholByBase = new Map()
  for (const s of scholarships) {
    const id = s.id || s.metadata?.id
    if (!id) continue
    const idStr = String(id)
    scholById.set(idStr, s)
    const base = baseSlug(idStr)
    if (base) {
      if (!scholByBase.has(base)) scholByBase.set(base, [])
      scholByBase.get(base).push(s)
    }
  }

  const unmatched = []
  for (const w of winners) {
    const sid = String(w.scholarship_id || '').trim()
    if (!sid) {
      unmatched.push({ winner: w, reason: 'missing scholarship_id' })
      continue
    }
    if (scholById.has(sid)) continue
    const base = baseSlug(sid)
    const candidates = [
      ...(scholById.has(base) ? [scholById.get(base)] : []),
      ...(scholByBase.get(base) ?? []),
    ]
    unmatched.push({ winner: w, candidates })
  }

  console.log(`Winners total: ${winners.length}`)
  console.log(`Scholarships total: ${scholarships.length}`)
  console.log(`Matched winners: ${winners.length - unmatched.length}`)
  console.log(`Unmatched winners: ${unmatched.length}`)
  console.log('--- Unmatched (with candidates) ---')
  for (const item of unmatched) {
    const sid = item.winner.scholarship_id || '(none)'
    console.log(`scholarship_id=${sid}`)
    if (item.reason) {
      console.log(`  reason: ${item.reason}`)
    }
    if (item.candidates?.length) {
      console.log('  candidates:')
      item.candidates.slice(0, 5).forEach((c) => {
        const id = c.id || c.metadata?.id || '(no id)'
        const name = c.name || '(no name)'
        console.log(`    - ${id} :: ${name}`)
      })
    } else {
      console.log('  candidates: none')
    }
  }
}

main().catch((err) => {
  console.error('match-winners-to-scholarships failed:', err)
  process.exitCode = 1
})
