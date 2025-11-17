import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react'

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
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to board</span>
          </Link>
          {detail?.url && (
            <a
              href={detail.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span>Open scholarship site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </header>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading scholarship details…</p>
        )}
        {error && (
          <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {detail && (
          <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Scholarship
                </p>
                <h1 className="font-display text-2xl leading-snug sm:text-3xl">
                  {detail.name}
                </h1>
                {detail.sponsor && (
                  <p className="text-xs text-muted-foreground">{detail.sponsor}</p>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
                  Min GPA: {detail.min_gpa ?? '—'}
                </span>
                <span className="rounded-full bg-background px-2 py-1 text-muted-foreground ring-1 ring-border">
                  Country: {detail.country ?? '—'}
                </span>
                {detail.fields && detail.fields.length > 0 && (
                  <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground">
                    {detail.fields.join(' • ')}
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <h2 className="text-sm font-semibold">What this scholarship says</h2>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {detail.raw_text.slice(0, 2000)}
                  {detail.raw_text.length > 2000 ? '…' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {personality && (
                <section className="space-y-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    <span>How to write for this</span>
                  </div>
                  <p className="text-sm text-foreground">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tone:{' '}
                    </span>
                    {personality.tone}
                  </p>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold">Themes they care about</p>
                    <div className="flex flex-wrap gap-1.5">
                      {personality.themes.length
                        ? personality.themes.map((theme) => (
                            <span
                              key={theme}
                              className="rounded-full bg-muted px-2 py-1 text-[11px]"
                            >
                              {theme}
                            </span>
                          ))
                        : '—'}
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <p className="font-semibold">What moves the needle</p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(personality.weights).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <span className="truncate">{key}</span>
                          <span className="tabular-nums">{value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {!personality && (
                <p className="rounded-2xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                  No stored personality profile yet. Run <code>/api/personality</code> for
                  this scholarship to give the essay agent better guidance.
                </p>
              )}
            </div>
          </section>
        )}

        {detail && (
          <section className="grid gap-6 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-3">
              <h2 className="font-display text-lg">Generate a tailored draft</h2>
              <p className="text-xs text-muted-foreground">
                Paste or edit your story, set a word target, and let the essay agent write
                a first draft that matches what this scholarship actually values.
              </p>
              <form className="space-y-3" onSubmit={generateDraft}>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Student summary / stories
                  </label>
                  <textarea
                    value={storiesText}
                    onChange={(e) => setStoriesText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rows={6}
                    placeholder="Describe your background, projects, challenges, and impact in your own words."
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Target words
                    </label>
                    <input
                      value={wordTarget}
                      onChange={(e) => setWordTarget(e.target.value)}
                      className="w-24 rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      type="number"
                      min={150}
                      max={800}
                    />
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Style notes (optional)
                    </label>
                    <input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder='e.g. "reflective but concise"'
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={draftLoading || !storiesText}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{draftLoading ? 'Drafting…' : 'Generate draft'}</span>
                  </button>
                  {draftError && (
                    <span className="text-xs text-destructive">{draftError}</span>
                  )}
                </div>
              </form>
            </div>

            {draft && (
              <div className="flex flex-col gap-3 rounded-xl bg-background p-3 text-sm text-muted-foreground shadow-inner">
                <h2 className="font-display text-base text-foreground">Draft</h2>
                <p className="whitespace-pre-line">{draft}</p>
                {explanation && (
                  <div className="mt-2 rounded-lg bg-muted/60 p-2 text-[11px]">
                    <p className="mb-1 font-semibold text-foreground">
                      Why it was written this way
                    </p>
                    <p>{explanation}</p>
                  </div>
                )}
              </div>
            )}

            {!draft && (
              <p className="text-xs text-muted-foreground">
                Your draft will appear here once generated. You can copy it into your own
                editor and revise freely.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
