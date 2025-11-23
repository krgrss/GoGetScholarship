/**
 * Rewrite winner scholarship_ids by matching the first word/slug chunk against scholarships.
 *
 * Usage:
 *   node scripts/rewrite-winners-by-firstword.js data/winners.jsonl data/scholarships_clean.jsonl data/winners.rewritten.jsonl
 *
 * Rules:
 * - Build a map from the first chunk of each scholarship id (id or metadata.id) to that full id.
 * - Only rewrite when the first chunk maps to exactly one scholarship id (to avoid collisions).
 * - Winners whose scholarship_id already matches a scholarship id are kept as-is.
 * - Outputs a rewritten JSONL file; does not modify the input.
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

function firstChunk(str) {
  if (!str) return ''
  // Take the first token separated by -, _, or space
  const token = String(str).split(/[-_\s]+/)[0]
  return token.toLowerCase()
}

async function main() {
  const [, , winnersArg = 'data/winners.jsonl', scholarshipsArg = 'data/scholarships_clean.jsonl', outArg = 'data/winners.rewritten.jsonl'] = process.argv
  const winnersPath = path.resolve(process.cwd(), winnersArg)
  const scholarshipsPath = path.resolve(process.cwd(), scholarshipsArg)
  const outPath = path.resolve(process.cwd(), outArg)

  const [winnersRaw, scholarshipsRaw] = await Promise.all([
    fs.readFile(winnersPath, 'utf8'),
    fs.readFile(scholarshipsPath, 'utf8'),
  ])

  const winners = parseJsonl(winnersRaw)
  const scholarships = parseJsonl(scholarshipsRaw)

  const scholIds = new Set()
  const chunkMap = new Map() // chunk -> Set of ids
  for (const s of scholarships) {
    const id = s.id || s.metadata?.id
    if (!id) continue
    const idStr = String(id)
    scholIds.add(idStr)
    const chunk = firstChunk(idStr)
    if (!chunk) continue
    if (!chunkMap.has(chunk)) chunkMap.set(chunk, new Set())
    chunkMap.get(chunk).add(idStr)
  }

  let rewritten = 0
  const outputLines = winners.map((w) => {
    const sid = String(w.scholarship_id ?? '').trim()
    const chunk = firstChunk(sid)
    if (scholIds.has(sid)) {
      return JSON.stringify(w)
    }
    const candidates = chunkMap.get(chunk)
    if (candidates && candidates.size === 1) {
      const targetId = [...candidates][0]
      const next = { ...w, scholarship_id: targetId }
      rewritten++
      return JSON.stringify(next)
    }
    return JSON.stringify(w)
  })

  await fs.writeFile(outPath, outputLines.join('\n') + '\n', 'utf8')
  console.log(`Winners processed: ${winners.length}`)
  console.log(`Scholarships loaded: ${scholarships.length}`)
  console.log(`Rewritten winners: ${rewritten}`)
  console.log(`Output: ${outPath}`)
}

main().catch((err) => {
  console.error('rewrite-winners-by-firstword failed:', err)
  process.exitCode = 1
})
