import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type TelemetryEvent = {
  step: string
  ok: boolean
  durationMs: number
  meta?: Record<string, unknown>
  error?: string
}

type TelemetryResponse = {
  ok: boolean
  events?: TelemetryEvent[]
  error?: string
}

export const Route = createFileRoute('/admin/debug')({
  component: DebugPage,
})

function DebugPage() {
  const [events, setEvents] = React.useState<TelemetryEvent[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [adminKey, setAdminKey] = React.useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('admin_key') || ''
  })
  const [students, setStudents] = React.useState<any[]>([])
  const [studentsError, setStudentsError] = React.useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/telemetry?limit=100')
      const data = (await res.json()) as TelemetryResponse
      if (!res.ok || !data.ok || !data.events) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      setEvents(data.events)
    } catch (e: any) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function loadStudents() {
    setStudentsError(null)
    try {
      const res = await fetch('/api/admin/students', {
        headers: adminKey ? { 'admin-api-key': adminKey } : undefined,
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }
      setStudents(data.students || [])
      if (adminKey) {
        localStorage.setItem('admin_key', adminKey)
      }
    } catch (e: any) {
      setStudentsError(String(e.message || e))
    }
  }

  const pipelineEvents = events.filter((e) => e.step === 'pipeline')

  const totalEvents = events.length
  const totalPipelines = pipelineEvents.length
  const lastPipeline = pipelineEvents[0]
  const errorCount = events.filter((e) => !e.ok).length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>Admin Lab</span>
            </p>
            <h1 className="font-display text-xl sm:text-2xl">
              Pipeline telemetry and live debugging
            </h1>
            <p className="text-xs text-muted-foreground">
              Inspect how the match → rerank → draft pipeline behaves in real time. This
              view is for you and judges, not students.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </header>

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Error: {error}
          </p>
        )}

        <section
          aria-label="Pipeline summary"
          className="grid gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-4"
        >
          <SummaryTile
            label="Total events"
            value={totalEvents}
          />
          <SummaryTile
            label="Pipelines"
            value={totalPipelines}
          />
          <SummaryTile
            label="Last pipeline (ms)"
            value={lastPipeline?.durationMs ?? '—'}
          />
          <SummaryTile
            label="Errors"
            value={errorCount}
            tone={errorCount > 0 ? 'error' : 'ok'}
          />
        </section>

        <Card className="rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Admin backdoor: students</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Provide the admin key to list recent student profiles saved via onboarding/profile.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin key"
                className="h-8 w-48 text-xs"
              />
              <Button size="sm" className="h-8" onClick={loadStudents}>
                Load students
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {studentsError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {studentsError}
              </p>
            )}
            {students.length === 0 && !studentsError && (
              <p className="text-xs text-muted-foreground">No students loaded yet.</p>
            )}
            {students.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-auto rounded-lg bg-background/60 p-2 text-xs ring-1 ring-border">
                {students.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md border border-border bg-background/80 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground">{s.name || '(no name)'}</div>
                      <span className="text-[10px] text-muted-foreground">{s.id}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {s.major || 'unknown major'} • {s.country || 'unknown country'} • GPA:{' '}
                      {s.gpa ?? 'n/a'}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                      {s.summary || '(no summary)'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <section
          aria-label="Recent events"
          className="space-y-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Recent events</h2>
            <p className="text-[11px] text-muted-foreground">
              Showing up to 100 events from the last few minutes.
            </p>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-xl bg-background/60 text-xs ring-1 ring-border">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-background/90">
                <tr className="text-[11px] text-muted-foreground">
                  <th className="px-2 py-1 text-left">Step</th>
                  <th className="px-2 py-1 text-left">OK</th>
                  <th className="px-2 py-1 text-left">Duration (ms)</th>
                  <th className="px-2 py-1 text-left">Meta</th>
                  <th className="px-2 py-1 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-border/60 align-top"
                  >
                    <td className="px-2 py-1 text-foreground">{e.step}</td>
                    <td className="px-2 py-1">
                      <span
                        className={
                          'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ' +
                          (e.ok
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-destructive/10 text-destructive')
                        }
                      >
                        {e.ok ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        <span>{e.ok ? 'yes' : 'no'}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1 text-foreground">{e.durationMs}</td>
                    <td className="px-2 py-1 text-muted-foreground">
                      {e.meta ? JSON.stringify(e.meta).slice(0, 120) : '—'}
                    </td>
                    <td className="px-2 py-1 text-destructive">
                      {e.error ? String(e.error).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && !loading && (
                  <tr>
                    <td
                      className="px-2 py-3 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No telemetry events yet. Run a match or draft to populate this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function SummaryTile(props: {
  label: string
  value: number | string
  tone?: 'default' | 'ok' | 'error'
}) {
  const tone = props.tone ?? 'default'
  const toneClasses =
    tone === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/5'
      : tone === 'error'
        ? 'border-destructive/40 bg-destructive/5'
        : 'border-border bg-background/60'

  return (
    <div className={`rounded-xl px-3 py-2 text-xs shadow-sm ring-1 ${toneClasses}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-1 text-sm text-foreground">{props.value}</div>
    </div>
  )
}
