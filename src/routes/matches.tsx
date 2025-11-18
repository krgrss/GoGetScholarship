import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CalendarDays, Filter, SlidersHorizontal } from 'lucide-react'

type MatchCard = {
  id: string
  name: string
  provider: string
  amount: string
  deadline: string
  daysLeft: string
  levelTags: string[]
  fieldTags: string[]
  demographicTags: string[]
  workload: string
  status?: 'in-progress' | 'ready'
}

const MOCK_MATCHES: MatchCard[] = [
  {
    id: '1',
    name: 'First-Gen STEM Innovators Scholarship',
    provider: 'Aurora Foundation',
    amount: 'Up to CAD 12,000',
    deadline: 'Jan 15, 2026',
    daysLeft: '45 days left',
    levelTags: ['Undergraduate'],
    fieldTags: ['STEM', 'Engineering'],
    demographicTags: ['First-generation priority'],
    workload: '1 essay • 2 refs • transcript',
    status: 'in-progress',
  },
  {
    id: '2',
    name: 'Community Impact Leaders Grant',
    provider: 'Northbridge Trust',
    amount: 'USD 5,000',
    deadline: 'Dec 20, 2025',
    daysLeft: '12 days left',
    levelTags: ['Undergraduate', 'Graduate'],
    fieldTags: ['Social impact'],
    demographicTags: [],
    workload: 'Short essay • 1 ref',
    status: 'ready',
  },
]

export const Route = createFileRoute('/matches')({
  component: MatchesPage,
})

function MatchesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="font-display text-2xl leading-snug sm:text-3xl">
            Your scholarship matches
          </h1>
          <p className="text-sm text-muted-foreground">
            Based on your profile and interests. Adjust filters to explore more.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Filters</h2>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">
                  Country / region
                </label>
                <select className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option>Any</option>
                  <option>Canada</option>
                  <option>United States</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">
                  Level of study
                </label>
                <select className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option>Any</option>
                  <option>High school</option>
                  <option>Undergraduate</option>
                  <option>Graduate</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">
                  Fields of study
                </label>
                <input
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Search fields (e.g. STEM, Arts)"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">
                  Workload
                </label>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Light', 'Medium', 'Heavy'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-full px-3 py-1 text-[11px] font-medium shadow-sm ring-1 ${
                        label === 'All'
                          ? 'bg-primary text-primary-foreground ring-primary'
                          : 'bg-background text-muted-foreground ring-border hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="mb-1 block font-medium text-muted-foreground">
                  Toggles
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-3 w-3 rounded border-border" />
                  <span>Show scholarships with priority for my demographics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-3 w-3 rounded border-border" />
                  <span>Hide scholarships I&apos;m clearly ineligible for</span>
                </label>
              </div>
            </div>
          </aside>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                <Filter className="h-3 w-3" />
                <span>{MOCK_MATCHES.length} matches</span>
              </div>
              <Link
                to="/onboarding"
                className="text-[11px] font-medium text-primary underline underline-offset-4"
              >
                Refine profile
              </Link>
            </div>

            <div className="grid gap-3">
              {MOCK_MATCHES.map((match) => (
                <article
                  key={match.id}
                  className="group rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:ring-primary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-base leading-snug">
                        {match.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {match.provider}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">{match.amount}</div>
                      <div className="inline-flex items-center gap-1 text-[11px]">
                        <CalendarDays className="h-3 w-3" />
                        <span>{match.deadline}</span>
                      </div>
                      <div className="text-[11px]">{match.daysLeft}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    {match.levelTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-1 font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {match.fieldTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border bg-background px-2 py-1 text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {match.demographicTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="text-[11px]">
                      Workload: {match.workload}
                    </span>
                    <div className="flex items-center gap-2">
                      {match.status && (
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                            match.status === 'in-progress'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {match.status === 'in-progress'
                            ? 'In progress'
                            : 'Ready to start'}
                        </span>
                      )}
                      <Link
                        to="/scholarship/$id"
                        params={{ id: match.id }}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </article>
              ))}

              {MOCK_MATCHES.length === 0 && (
                <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border">
                  <p>No scholarships match your current filters.</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

