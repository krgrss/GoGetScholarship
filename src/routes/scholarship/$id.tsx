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
  metadata: any
}

type Personality = {
  weights: Record<string, number>
  themes: string[]
  tone: string
  constraints: string[]
  notes: string[]
}

type FitExplanation = {
  reasons: string[]
  eligibility: string[]
  gaps: string[]
  score: number
}

type CriterionScore = {
  id: string
  name: string
  score: number
  max: number
  feedback: string
}

type GradeResult = {
  criteria: CriterionScore[]
  overall_comment: string
  readiness: 'needs_work' | 'solid' | 'ready'
}

type DetailResponse = {
  ok: boolean
  scholarship?: Scholarship
  personality?: Personality | null
  error?: string
}

export const Route = createFileRoute('/scholarship/$id')({
  component: ScholarshipPage,
  validateSearch: (search: { studentSummary?: string; studentId?: string }) => search,
})

function ScholarshipPage() {
  const { id } = Route.useParams()
  const { studentSummary, studentId } = Route.useSearch()

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

  const [fitExplanation, setFitExplanation] = React.useState<FitExplanation | null>(null)
  const [fitLoading, setFitLoading] = React.useState(false)
  const [fitError, setFitError] = React.useState<string | null>(null)

  const [gradeResult, setGradeResult] = React.useState<GradeResult | null>(null)
  const [gradeLoading, setGradeLoading] = React.useState(false)
  const [gradeError, setGradeError] = React.useState<string | null>(null)
  const [sideTab, setSideTab] = React.useState<'rubric' | 'themes'>('rubric')

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    setPersonality(null)
    setFitExplanation(null)
    setFitError(null)
    setFitLoading(false)
    setGradeResult(null)
    setGradeError(null)
    setGradeLoading(false)

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
    setGradeResult(null)
    setGradeError(null)

    const rubric =
      detail?.metadata && typeof detail.metadata === 'object'
        ? (detail.metadata.rubric as {
            id: string
            name: string
            description?: string
            weight?: number
          }[] | undefined)
        : undefined

    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarship_id: detail.id,
          student_id: studentId || undefined,
          scholarship_name: detail.name,
          scholarship_text: detail.raw_text,
          personality,
          rubric: rubric ?? [],
          student_profile: {
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

  async function fetchFitExplanation() {
    if (!detail) return

    if (!studentId) {
      setFitError(
        'To see why this fits you, open this scholarship from your matches so we know which student profile to use.',
      )
      return
    }

    setFitLoading(true)
    setFitError(null)
    setFitExplanation(null)

    try {
      const res = await fetch('/api/explain-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          scholarship_id: detail.id,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Explain-fit request failed (${res.status})`)
      }
      setFitExplanation(data.explanation as FitExplanation)
    } catch (err: any) {
      setFitError(String(err.message || err))
    } finally {
      setFitLoading(false)
    }
  }

  async function gradeDraft() {
    if (!draft) {
      setGradeError('Generate a draft first, then grade it against the rubric.')
      return
    }

    const rubric =
      detail?.metadata && typeof detail.metadata === 'object'
        ? (detail.metadata.rubric as {
            id: string
            name: string
            description?: string
            weight?: number
          }[] | undefined)
        : undefined

    if (!rubric || rubric.length === 0) {
      setGradeError('No rubric configured for this scholarship yet.')
      return
    }

    setGradeLoading(true)
    setGradeError(null)
    setGradeResult(null)

    try {
      const res = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft, rubric }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Grade request failed (${res.status})`)
      }
      setGradeResult(data.result as GradeResult)
    } catch (err: any) {
      setGradeError(String(err.message || err))
    } finally {
      setGradeLoading(false)
    }
  }

  const draftWordCount = React.useMemo(() => {
    if (!draft) return 0
    return draft
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  }, [draft])

  function readinessLabel(readiness: GradeResult['readiness']) {
    switch (readiness) {
      case 'needs_work':
        return 'Needs work'
      case 'solid':
        return 'Solid'
      case 'ready':
        return 'Ready'
      default:
        return readiness
    }
  }

  function readinessClasses(readiness: GradeResult['readiness']) {
    switch (readiness) {
      case 'needs_work':
        return 'bg-destructive/10 text-destructive'
      case 'solid':
        return 'bg-amber-500/10 text-amber-700'
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-700'
      default:
        return 'bg-muted text-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
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
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
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
              <div className="space-y-1 text-right text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center justify-end gap-2">
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
                {draft && (
                  <p className="text-[11px]">
                    {draftWordCount} / {wordTarget || '—'} words
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
              <div className="space-y-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
                  <p className="mb-1 font-semibold text-foreground">Prompt & context</p>
                  <p className="whitespace-pre-line text-xs">
                    {detail.raw_text.slice(0, 800)}
                    {detail.raw_text.length > 800 ? '…' : ''}
                  </p>
                </div>

                <form className="space-y-3" onSubmit={generateDraft}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Student summary / stories
                    </label>
                    <textarea
                      value={storiesText}
                      onChange={(e) => setStoriesText(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={8}
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

                <div className="space-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <p>
                    Saved drafts are not persisted in this prototype; copy anything you like
                    into your own editor.
                  </p>
                </div>

                {draft && (
                  <div className="mt-2 flex flex-col gap-3 rounded-xl bg-background p-3 text-sm text-muted-foreground shadow-inner">
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
              </div>

              <aside className="space-y-4 rounded-2xl bg-card p-4 text-xs shadow-sm ring-1 ring-border">
                {detail.metadata?.rubric && Array.isArray(detail.metadata.rubric) && (
                  <section className="space-y-2">
                    <h2 className="text-sm font-semibold text-foreground">Rubric</h2>
                    <p className="text-[11px] text-muted-foreground">
                      How this scholarship is likely to grade your essay.
                    </p>
                    <div className="rounded-xl bg-muted/40 p-3">
                      <ul className="space-y-1">
                        {detail.metadata.rubric.map(
                          (crit: {
                            id: string
                            name: string
                            description?: string
                            weight?: number
                          }) => (
                            <li
                              key={crit.id}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="truncate text-[11px] text-foreground">
                                {crit.name}
                              </span>
                              {typeof crit.weight === 'number' && (
                                <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                                  {(crit.weight * 100).toFixed(0)}%
                                </span>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={gradeDraft}
                        disabled={gradeLoading || !draft}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-secondary-foreground shadow-sm transition hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {gradeLoading ? 'Grading against rubric…' : 'Grade against rubric'}
                        </span>
                      </button>
                      {gradeError && (
                        <span className="text-[11px] text-destructive">{gradeError}</span>
                      )}
                    </div>

                    {gradeResult && (
                      <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-2">
                        <div className="flex items-center justify_between gap-2">
                          <p className="font-semibold text-foreground">Readiness</p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${readinessClasses(gradeResult.readiness)}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            <span>{readinessLabel(gradeResult.readiness)}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {gradeResult.overall_comment}
                        </p>
                        <div className="space-y-1.5">
                          {gradeResult.criteria.map((crit) => (
                            <div
                              key={crit.id}
                              className="rounded-lg bg-background/80 px-2 py-1.5 text-[11px]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground">
                                  {crit.name}
                                </span>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                                  {crit.score} / {crit.max}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {crit.feedback}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {personality && (
                  <section className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-secondary" />
                      <span>Themes & tone</span>
                    </div>
                    <p className="text-[11px] text-foreground">
                      <span className="font-semibold text-muted-foreground">Tone: </span>
                      {personality.tone}
                    </p>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
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
                  </section>
                )}

                {detail && (
                  <section className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                      <span>Why this fits you</span>
                      {fitExplanation && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          Fit score: {Math.round(fitExplanation.score)}
                        </span>
                      )}
                    </div>

                    {!studentId && (
                      <p className="text-[11px] text-muted-foreground">
                        To see a personalized explanation, open this scholarship from your
                        matches so we know which student profile to use.
                      </p>
                    )}

                    {studentId && (
                      <>
                        <button
                          type="button"
                          onClick={fetchFitExplanation}
                          disabled={fitLoading}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-secondary-foreground shadow-sm transition hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{fitLoading ? 'Analyzing…' : 'Why this fits you'}</span>
                        </button>

                        {fitError && (
                          <p className="text-[11px] text-destructive">{fitError}</p>
                        )}

                        {fitExplanation && (
                          <div className="space-y-2 text-[11px] text-muted-foreground">
                            {fitExplanation.reasons.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground">Top reasons</p>
                                <ul className="mt-1 list-disc space-y-1 pl-4">
                                  {fitExplanation.reasons.map((reason) => (
                                    <li key={reason}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {fitExplanation.eligibility.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground">Eligibility</p>
                                <ul className="mt-1 list-disc space-y-1 pl-4">
                                  {fitExplanation.eligibility.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {fitExplanation.gaps.length > 0 && (
                              <div>
                                <p className="font-semibold text-foreground">Gaps or risks</p>
                                <ul className="mt-1 list-disc space-y-1 pl-4">
                                  {fitExplanation.gaps.map((gap) => (
                                    <li key={gap}>{gap}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}

                {!personality && !detail.metadata?.rubric && (
                  <p className="text-[11px] text-muted-foreground">
                    Once you configure a rubric and personality profile for this scholarship,
                    this sidebar will show how to aim your essays.
                  </p>
                )}
              </aside>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
