import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarDays, ArrowRight } from 'lucide-react'

type ApplicationRow = {
  id: string
  name: string
  provider: string
  deadline: string
  status: 'not_started' | 'in_progress' | 'ready' | 'submitted'
  readiness: 'needs_work' | 'solid' | 'ready'
}

const MOCK_APPLICATIONS: ApplicationRow[] = [
  {
    id: 'loran-scholars-foundation-ca-ug-2025',
    name: 'Loran Scholars Foundation Scholarship',
    provider: 'Loran Scholars Foundation',
    deadline: 'Oct 16, 2024',
    status: 'in_progress',
    readiness: 'solid',
  },
  {
    id: 'community-impact-leaders-grant',
    name: 'Community Impact Leaders Grant',
    provider: 'Northbridge Trust',
    deadline: 'Dec 20, 2025',
    status: 'not_started',
    readiness: 'needs_work',
  },
  {
    id: 'women-in-stem-excellence-award',
    name: 'Women in STEM Excellence Award',
    provider: 'Aurora Foundation',
    deadline: 'Jan 15, 2026',
    status: 'ready',
    readiness: 'ready',
  },
]

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  const trackedCount = MOCK_APPLICATIONS.length
  const readyCount = MOCK_APPLICATIONS.filter((a) => a.readiness === 'ready').length
  const inProgressCount = MOCK_APPLICATIONS.filter(
    (a) => a.status === 'in_progress',
  ).length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dashboard
          </p>
          <h1 className="font-display text-2xl leading-snug sm:text-3xl">
            Keep your scholarships on track.
          </h1>
          <p className="text-sm text-muted-foreground">
            See where you&apos;re ready, what needs work, and where one essay can unlock
            extra opportunities.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <DashboardStat
            label="Tracked scholarships"
            value={trackedCount}
            tone="primary"
          />
          <DashboardStat label="Ready to submit" value={readyCount} tone="success" />
          <DashboardStat
            label="In progress"
            value={inProgressCount}
            tone="warning"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
          <div className="space-y-3 rounded-2xl bg-card p-5 text-sm shadow-sm ring-1 ring-border">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Your applications</h2>
                <p className="text-[11px] text-muted-foreground">
                  Status and readiness for the scholarships you&apos;re actively tracking.
                </p>
              </div>
              <Link
                to="/matches"
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Find more matches
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl ring-1 ring-border">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-muted/60">
                  <tr className="text-[11px] text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Scholarship</th>
                    <th className="px-3 py-2 text-left font-medium">Deadline</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Readiness</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_APPLICATIONS.map((app) => (
                    <tr
                      key={app.id}
                      className="border-t border-border/60 bg-card/80 hover:bg-muted/40"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground">{app.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {app.provider}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span>{app.deadline}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <ReadinessBadge readiness={app.readiness} />
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <Link
                          to="/scholarship/$id"
                          params={{ id: app.id }}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl bg-card p-5 text-xs shadow-sm ring-1 ring-border">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">Low extra work suggestions</h2>
              <p className="text-[11px] text-muted-foreground">
                Scholarships where your existing essays and stories get you most of the
                way there.
              </p>
            </div>

            <div className="space-y-3">
              <SuggestionCard
                title="Community Impact Leaders Grant"
                amount="USD 5,000"
                deadline="Dec 20, 2025"
                note="Similar leadership essay to Loran Scholars; slightly lighter workload."
              />
              <SuggestionCard
                title="Women in STEM Excellence Award"
                amount="Up to CAD 12,000"
                deadline="Jan 15, 2026"
                note="Shares core STEM impact themes with your main essay; same components."
              />
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

function DashboardStat(props: {
  label: string
  value: number
  tone: 'primary' | 'success' | 'warning'
}) {
  const toneClasses =
    props.tone === 'primary'
      ? 'bg-primary/10 text-primary'
      : props.tone === 'success'
        ? 'bg-emerald-500/10 text-emerald-700'
        : 'bg-amber-500/10 text-amber-700'

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <p className="text-[11px] font-medium text-muted-foreground">{props.label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${toneClasses}`}>
        {props.value}
      </p>
    </div>
  )
}

function StatusBadge(props: { status: ApplicationRow['status'] }) {
  const label =
    props.status === 'not_started'
      ? 'Not started'
      : props.status === 'in_progress'
        ? 'In progress'
        : props.status === 'ready'
          ? 'Ready'
          : 'Submitted'

  const classes =
    props.status === 'submitted'
      ? 'bg-emerald-500/10 text-emerald-700'
      : props.status === 'ready'
        ? 'bg-emerald-500/10 text-emerald-700'
        : props.status === 'in_progress'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-foreground'

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${classes}`}>
      {label}
    </span>
  )
}

function ReadinessBadge(props: { readiness: ApplicationRow['readiness'] }) {
  const label =
    props.readiness === 'needs_work'
      ? 'Needs work'
      : props.readiness === 'solid'
        ? 'Solid'
        : 'Ready'

  const classes =
    props.readiness === 'needs_work'
      ? 'bg-destructive/10 text-destructive'
      : props.readiness === 'solid'
        ? 'bg-amber-500/10 text-amber-700'
        : 'bg-emerald-500/10 text-emerald-700'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </span>
  )
}

function SuggestionCard(props: {
  title: string
  amount: string
  deadline: string
  note: string
}) {
  return (
    <article className="space-y-1 rounded-2xl bg-background/80 p-4 text-xs shadow-sm ring-1 ring-border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
          <p className="text-[11px] text-muted-foreground">{props.amount}</p>
        </div>
        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          <span>{props.deadline}</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{props.note}</p>
      <Link
        to="/scholarship/$id"
        params={{ id: 'loran-scholars-foundation-ca-ug-2025' }}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline underline-offset-4"
      >
        Start plan
        <ArrowRight className="h-3 w-3" />
      </Link>
    </article>
  )
}

