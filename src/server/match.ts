/**
 * Match workflow orchestrator.
 * - validate input
 * - embed student summary
 * - retrieve top-K scholarships via pgvector
 * - (optional) LLM rerank
 * - assemble structured response + basic telemetry
 */
import { embedWithVoyage } from './embeddings/voyage'
import { EligibilityFilter, topKByEmbedding } from './db'
import { rerankWithClaude } from './rerank'
import { cacheGet, cacheSet } from './cache'
import { recordTelemetry } from './telemetry'

export type MatchRequest = {
  studentSummary: string
  minGpa?: number
  k?: number
  useReranker?: boolean
  eligibility?: EligibilityFilter
}

export type MatchRow = {
  id: string
  name: string
  url: string | null
  min_gpa: number | null
  distance: number
  dot_sim: number
  score?: number
  rationale?: string
}

export type MatchResponse =
  | {
      ok: true
      rows: MatchRow[]
      meta: {
        usedReranker: boolean
        totalMs: number
        embedMs: number
        retrieveMs: number
        rerankMs?: number
      }
    }
  | {
      ok: false
      error: string
    }

const MIN_CANDIDATES_FOR_RERANK = 3

export async function runMatchWorkflow(req: MatchRequest): Promise<MatchResponse> {
  const started = Date.now()

  const summary = (req.studentSummary || '').trim()
  if (!summary) {
    return { ok: false, error: 'student_summary is required' }
  }

  const k = Math.max(1, Math.min(50, req.k ?? 20))

  // Embedding
  const t0 = Date.now()
  let embedding: number[]
  try {
    const [emb] = await embedWithVoyage([summary])
    embedding = emb
  } catch (e: any) {
    const durationMs = Date.now() - t0
    recordTelemetry({ step: 'embed', ok: false, durationMs, error: String(e) })
    return { ok: false, error: 'Failed to embed student summary' }
  }
  const embedMs = Date.now() - t0
  recordTelemetry({ step: 'embed', ok: true, durationMs: embedMs })

  // Retrieval
  const t1 = Date.now()
  let rows: MatchRow[]
  try {
    const dbRows = await topKByEmbedding(embedding, k, req.minGpa ?? null, req.eligibility)
    rows = dbRows as MatchRow[]
  } catch (e: any) {
    const durationMs = Date.now() - t1
    recordTelemetry({ step: 'retrieve', ok: false, durationMs, error: String(e) })
    return { ok: false, error: 'Failed to retrieve scholarships' }
  }
  const retrieveMs = Date.now() - t1
  recordTelemetry({
    step: 'retrieve',
    ok: true,
    durationMs: retrieveMs,
    meta: { count: rows.length },
  })

  if (rows.length < MIN_CANDIDATES_FOR_RERANK) {
    const totalMs = Date.now() - started
    recordTelemetry({
      step: 'pipeline',
      ok: true,
      durationMs: totalMs,
      meta: { usedReranker: false, reason: 'not_enough_candidates' },
    })
    return {
      ok: true,
      rows,
      meta: {
        usedReranker: false,
        totalMs,
        embedMs,
        retrieveMs,
      },
    }
  }

  if (!req.useReranker) {
    const totalMs = Date.now() - started
    recordTelemetry({
      step: 'pipeline',
      ok: true,
      durationMs: totalMs,
      meta: { usedReranker: false },
    })
    return {
      ok: true,
      rows,
      meta: {
        usedReranker: false,
        totalMs,
        embedMs,
        retrieveMs,
      },
    }
  }

  // Optional reranker with simple cache
  const cacheKey = JSON.stringify({
    kind: 'match-rerank',
    summary,
    minGpa: req.minGpa ?? null,
    k,
    version: 1,
  })

  const cached = cacheGet<MatchRow[]>(cacheKey)
  if (cached) {
    const totalMs = Date.now() - started
    recordTelemetry({
      step: 'pipeline',
      ok: true,
      durationMs: totalMs,
      meta: { usedReranker: true, cacheHit: true },
    })
    return {
      ok: true,
      rows: cached,
      meta: {
        usedReranker: true,
        totalMs,
        embedMs,
        retrieveMs,
        rerankMs: 0,
      },
    }
  }

  const t2 = Date.now()
  try {
    const candidates = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      snippet: '',
    }))
    const ranking = await rerankWithClaude(summary, candidates)

    const reranked = ranking
      .map((ranked) => {
        const base = rows.find((r) => String(r.id) === ranked.id)
        if (!base) return null
        return {
          ...base,
          score: ranked.score,
          rationale: ranked.rationale,
        } as MatchRow
      })
      .filter(Boolean) as MatchRow[]

    const rerankMs = Date.now() - t2
    recordTelemetry({
      step: 'rerank',
      ok: true,
      durationMs: rerankMs,
      meta: { count: reranked.length },
    })

    cacheSet(cacheKey, reranked, 24 * 60 * 60 * 1000)

    const totalMs = Date.now() - started
    recordTelemetry({
      step: 'pipeline',
      ok: true,
      durationMs: totalMs,
      meta: { usedReranker: true, cacheHit: false },
    })

    return {
      ok: true,
      rows: reranked,
      meta: {
        usedReranker: true,
        totalMs,
        embedMs,
        retrieveMs,
        rerankMs,
      },
    }
  } catch (e: any) {
    const rerankMs = Date.now() - t2
    recordTelemetry({
      step: 'rerank',
      ok: false,
      durationMs: rerankMs,
      error: String(e),
    })
    const totalMs = Date.now() - started
    recordTelemetry({
      step: 'pipeline',
      ok: false,
      durationMs: totalMs,
      meta: { usedReranker: true, failedAt: 'rerank' },
    })
    return {
      ok: true,
      rows,
      meta: {
        usedReranker: false,
        totalMs,
        embedMs,
        retrieveMs,
      },
    }
  }
}
