import { Link, createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const [name, setName] = React.useState('')
  const [gpa, setGpa] = React.useState<string>('')
  const [major, setMajor] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [stories, setStories] = React.useState('')
  const [minGpa, setMinGpa] = React.useState<string>('')

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<any[]>([])
  const [studentSummary, setStudentSummary] = React.useState<string | null>(null)
  const [studentId, setStudentId] = React.useState<string | null>(null)
  const [ranking, setRanking] = React.useState<any[] | null>(null)
  const [rerankError, setRerankError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults([])
    setRanking(null)
    setRerankError(null)

    const parts = [
      name && `Name: ${name.trim()}`,
      gpa && `GPA: ${gpa.trim()}`,
      major && `Major: ${major.trim()}`,
      country && `Country: ${country.trim()}`,
      stories && `Stories: ${stories.trim()}`,
    ].filter(Boolean)
    const student_summary = parts.join('\n').trim() || 'Student profile summary'
    setStudentSummary(student_summary)

    try {
      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: studentId ?? undefined,
          name: name || undefined,
          gpa: gpa ? Number(gpa) : undefined,
          major: major || undefined,
          country: country || undefined,
          summary: student_summary,
          metadata: {
            stories: stories || undefined,
          },
        }),
      })
      const profileData = await profileRes.json()
      if (!profileRes.ok || !profileData.ok) {
        throw new Error(profileData?.error || `Profile save failed (${profileRes.status})`)
      }
      if (profileData.student_id) {
        setStudentId(profileData.student_id)
        localStorage.setItem('scholarship_student_id', profileData.student_id)
      }

      // Persist summary for downstream match calls as a basic cache for the demo.
      const profilePayload = {
        name,
        gpa: gpa || undefined,
        major: major || undefined,
        country: country || undefined,
        stories: stories || undefined,
        summary: student_summary,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('scholarship_profile', JSON.stringify(profilePayload))

      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_summary,
          min_gpa: minGpa ? Number(minGpa) : undefined,
          k: 20,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      const rows = data.rows || []
      setResults(rows)

      if (rows.length > 0) {
        try {
          const rerankRes = await fetch('/api/rerank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_summary,
              candidates: rows.map((r: any) => ({
                id: String(r.id),
                name: r.name,
                snippet: r.raw_text ?? '',
                min_gpa: typeof r.min_gpa === 'number' ? r.min_gpa : undefined,
                country: r.country ?? undefined,
                fields: Array.isArray(r.fields) ? r.fields : [],
              })),
              top_k: 20,
            }),
          })
          const rerankData = await rerankRes.json()
          if (!rerankRes.ok || !rerankData.ok) {
            throw new Error(rerankData?.error || `Rerank request failed (${rerankRes.status})`)
          }

          const rankingById = new Map<string, any>()
          for (const item of rerankData.ranking || []) {
            rankingById.set(String(item.id), item)
          }

          const enriched = rows
            .map((r: any) => {
              const rr = rankingById.get(String(r.id))
              if (!rr) return null
              return {
                ...r,
                score: rr.score,
                rationale: rr.rationale,
              }
            })
            .filter(Boolean)

          setRanking(enriched as any[])
        } catch (err: any) {
          setRerankError(String(err.message || err))
        }
      }
    } catch (err: any) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Profile lab</span>
            </p>
            <h1 className="font-display text-2xl leading-snug sm:text-3xl">
              Experiment with your profile & matches.
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              This page lets you poke the matching pipeline directly. For the main student
              flow, use the onboarding wizard and Matches board.
            </p>
          </div>
          <Link
            to="/matches"
            className="hidden rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted md:inline-flex"
          >
            View matches
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl bg-card p-5 text-sm shadow-sm ring-1 ring-border"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">Profile basics</h2>
              <p className="text-[11px] text-muted-foreground">
                Fill just enough that a real student might write here. This saves to `/api/profile`
                and localStorage so Matches can re-use it.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  GPA
                </label>
                <input
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g., 3.7"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Major / program
                </label>
                <input
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Country
                </label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g., Canada, United States"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Filter: min scholarship GPA
                </label>
                <input
                  value={minGpa}
                  onChange={(e) => setMinGpa(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="optional"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Stories / achievements
              </label>
              <textarea
                value={stories}
                onChange={(e) => setStories(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={5}
                placeholder="Briefly describe projects, leadership, community work, challenges, and impact."
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This acts like a mini-activities list for the AI. You can paste from your
                resume or Common App.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span>{loading ? 'Matching…' : 'Save & find scholarships'}</span>
              </button>
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          </form>

          <aside className="space-y-4 rounded-2xl bg-card p-4 text-xs shadow-sm ring-1 ring-border">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">Pipeline output</h2>
              <p className="text-[11px] text-muted-foreground">
                After you save, this panel shows raw vector matches and Claude reranking.
              </p>
            </div>

            {results.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground">
                  Vector matches (Voyage + pgvector)
                </h3>
                <div className="max-h-60 space-y-2 overflow-auto rounded-xl bg-background/60 p-2 ring-1 ring-border">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-border bg-background/80 p-2"
                    >
                      <div className="text-xs font-medium text-foreground">{r.name}</div>
                      {r.url && (
                        <a
                          href={r.url}
                          className="text-[11px] text-primary underline underline-offset-4"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.url}
                        </a>
                      )}
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        min_gpa: {r.min_gpa ?? '—'} · dot_sim:{' '}
                        {typeof r.dot_sim === 'number' ? r.dot_sim.toFixed(4) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold text-foreground">
                    Claude-ranked scholarships
                  </h3>
                  {rerankError && (
                    <span className="text-[10px] text-destructive">
                      Rerank error: {rerankError}
                    </span>
                  )}
                </div>
                {!ranking && !rerankError && (
                  <p className="text-[11px] text-muted-foreground">
                    Reranking with Claude…
                  </p>
                )}
                {ranking && ranking.length > 0 && (
                  <div className="max-h-60 space-y-2 overflow-auto rounded-xl bg-background/60 p-2 ring-1 ring-border">
                    {ranking.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border bg-background/80 p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to="/scholarship/$id"
                            params={{ id: String(r.id) }}
                            search={
                              studentSummary
                                ? {
                                    studentSummary,
                                    studentId: studentId ?? undefined,
                                  }
                                : undefined
                            }
                            className="text-xs font-medium text-primary underline underline-offset-4"
                          >
                            {r.name}
                          </Link>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            Score:{' '}
                            {typeof r.score === 'number' ? r.score : '—'}
                          </span>
                        </div>
                        {r.url && (
                          <a
                            href={r.url}
                            className="text-[11px] text-primary/80 underline underline-offset-4"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.url}
                          </a>
                        )}
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {r.rationale || 'No rationale provided.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {results.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No results yet. Submit the form to see how the system interprets your
                answers.
              </p>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}

/**
 * Profile lab page
 * - Collects a lightweight student profile and calls /api/profile, /api/match, and /api/rerank.
 * - Used mainly for debugging the matching pipeline; main student flow uses onboarding + matches.
 */
