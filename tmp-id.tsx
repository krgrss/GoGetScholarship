// @ts-nocheck
import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'

type Scholarship = {
  id: string
  name: string
  sponsor: string | null
  url: string | null
  raw_text: string
  min_gpa: unknown
  country: string | null
  fields: string[] | null
  metadata: unknown
}

type Personality = {
  weights: Record<string, number>
  themes: string[]
  tone: string
  constraints: string[]
  notes: string[]
}

type DetailResponse = {
  ok: boolean
  scholarship?: Scholarship
  personality?: Personality | null
  error?: string
}

export const Route = createFileRoute('/scholarship/$id')({
  component: ScholarshipPage,
  validateSearch: (search: { studentSummary?: string }) => search,
})

function ScholarshipPage() {
  const { id } = Route.useParams()
  const { studentSummary } = Route.useSearch()

  const [detail, setDetail] = React.useState<Scholarship | null>(null)
  const [personality, setPersonality] = React.useState<Personality | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [storiesText, setStoriesText] = React.useState(studentSummary ?? '')
  const [wordTarget, setWordTarget] = React.useState('350')
  const [style, setStyle] = React.useState('')

  const [draftLoading, setDraftLoading] = React.useState(false)
  const [draftError, setDraftError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<string | null>(null)
  const [explanation, setExplanation] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    setPersonality(null)

    fetch(`/api/scholarship/${id}`)
      .then(async (res) => {
        const data = (await res.json()) as DetailResponse
        if (!res.ok || !data.ok || !data.scholarship) {
          throw new Error(data.error || `Failed to load scholarship (${res.status})`)
        }
        return data
      })
      .then((data) => {
        if (cancelled) return
        setDetail(data.scholarship!)
        setPersonality(data.personality ?? null)
      })
      .catch((err: any) => {
        if (cancelled) return
        setError(String(err.message || err))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function generateDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!detail || !personality) {
      setDraftError(
        'Missing scholarship personality. Run /api/personality for this scholarship first.',
      )
      return
    }

    setDraftLoading(true)
    setDraftError(null)
    setDraft(null)
    setExplanation(null)

    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarship_id: detail.id,
          scholarship_name: detail.name,
          scholarship_text: detail.raw_text,
          personality,
          student_profile: {
            // Treat the summary / textarea as a single story blob
            stories: storiesText ? [storiesText] : [],
          },
          word_target: Number(wordTarget) || 350,
          style: style || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Draft request failed (${res.status})`)
      }
      setDraft(data.draft)
      setExplanation(data.explanation)
    } catch (err: any) {
      setDraftError(String(err.message || err))
    } finally {
      setDraftLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {loading && <p className="text-slate-400">Loading scholarship...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {detail && (
        <section className="space-y-2">
          <h1 className="text-2xl font-bold">{detail.name}</h1>
          {detail.url && (
            <a
              href={detail.url}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 text-sm"
            >
              View scholarship site
            </a>
          )}
          <p className="text-xs text-slate-400">
            id: {detail.id} | min_gpa: {detail.min_gpa ?? '—'} | country:{' '}
            {detail.country ?? '—'}
          </p>
          <div className="mt-3 space-y-1">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-sm text-slate-200 whitespace-pre-line">
              {detail.raw_text.slice(0, 2000)}
            </p>
          </div>
        </section>
      )}

      {personality && (
        <section className="space-y-2 bg-slate-800/40 border border-slate-700 p-4 rounded">
          <h2 className="text-lg font-semibold">Scholarship Personality</h2>
          <p className="text-sm text-slate-300">Tone: {personality.tone}</p>
          <p className="text-xs text-slate-400">
            Themes: {personality.themes.length ? personality.themes.join(', ') : '—'}
          </p>
          <div className="text-xs text-slate-400">
            <p className="font-semibold mt-2 mb-1">Weights</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
              {Object.entries(personality.weights).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}</span>
                  <span>{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {detail && (
        <section className="space-y-3 bg-slate-800/40 border border-slate-700 p-4 rounded">
          <h2 className="text-lg font-semibold">Generate Essay Draft</h2>
          {!personality && (
            <p className="text-xs text-yellow-300">
              No personality profile stored yet. Run /api/personality for this scholarship to
              get better drafts.
            </p>
          )}
          <form className="space-y-3" onSubmit={generateDraft}>
            <div>
              <label className="block text-sm mb-1">Student summary / stories</label>
              <textarea
                value={storiesText}
                onChange={(e) => setStoriesText(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm"
                rows={6}
                placeholder="Paste or edit the summary of your background, projects, challenges, etc."
              />
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div>
                <label className="block text-xs mb-1">Target words</label>
                <input
                  value={wordTarget}
                  onChange={(e) => setWordTarget(e.target.value)}
                  className="w-24 rounded border border-slate-600 bg-slate-800 p-2"
                  type="number"
                  min={150}
                  max={800}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs mb-1">Style override (optional)</label>
                <input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-800 p-2"
                  placeholder='e.g. "reflective but concise"'
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={draftLoading || !storiesText}
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
              >
                {draftLoading ? 'Drafting...' : 'Generate Draft'}
              </button>
              {draftError && <span className="text-xs text-red-400">{draftError}</span>}
            </div>
          </form>
        </section>
      )}

      {draft && (
        <section className="space-y-3 bg-slate-900/50 border border-slate-700 p-4 rounded">
          <h2 className="text-lg font-semibold">Draft</h2>
          <p className="text-sm text-slate-100 whitespace-pre-line">{draft}</p>
          {explanation && (
            <div className="text-xs text-slate-400 mt-3">
              <p className="font-semibold mb-1">Why it was written this way</p>
              <p>{explanation}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
