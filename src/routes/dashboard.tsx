import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type DashboardKpi = {
  total: number
  inProgress: number
  completed: number
  potentialValue: string
}

type DashboardApplication = {
  id: string
  draftId: string
  name: string
  provider: string
  deadline: string
  status: string
  progress: number
  readiness: 'needs_work' | 'solid' | 'ready'
  nextAction: string
  workloadLabel?: 'Light' | 'Medium' | 'Heavy'
  workloadItems?: string[]
}

function DashboardPage() {
  const [kpi, setKpi] = React.useState<DashboardKpi | null>(null)
  const [applications, setApplications] = React.useState<DashboardApplication[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const studentId =
          localStorage.getItem('scholarship_student_id') ||
          localStorage.getItem('student_id')

        if (!studentId) {
          setError(
            'No saved profile found. Complete onboarding to save your profile and drafts first.',
          )
          return
        }

        const res = await fetch(`/api/dashboard?student_id=${encodeURIComponent(studentId)}`)
        const json = await res.json()
        if (!res.ok || !json.ok) {
          throw new Error(json?.error || `Dashboard request failed (${res.status})`)
        }

        setKpi(json.kpi as DashboardKpi)
        setApplications((json.applications ?? []) as DashboardApplication[])
      } catch (e: any) {
        setError(String(e?.message || e))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const suggestions = React.useMemo(() => {
    if (!applications.length) return [] as { id: string; text: string; href: string }[]
    const candidates = applications
      .filter((a) => a.status.toLowerCase().includes('progress') && a.readiness !== 'ready')
      .sort((a, b) => (a.workloadLabel === 'Light' ? -1 : 0) - (b.workloadLabel === 'Light' ? -1 : 0))
      .slice(0, 3)
    return candidates.map((app) => ({
      id: app.id,
      text: `Low effort: ${app.name}`,
      href: `/scholarship/${app.id}`,
    }))
  }, [applications])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/10 pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your applications, readiness, and next steps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/matches">
                <Plus className="mr-2 h-4 w-4" />
                Find Scholarships
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpi
            ? [
                {
                  title: 'Total Applications',
                  value: String(kpi.total),
                  icon: FileText,
                },
                {
                  title: 'In Progress',
                  value: String(kpi.inProgress),
                  icon: Clock,
                },
                {
                  title: 'Completed',
                  value: String(kpi.completed),
                  icon: CheckCircle2,
                },
                {
                  title: 'Potential Value',
                  value: kpi.potentialValue,
                  icon: TrendingUp,
                },
              ].map((item) => (
                <Card key={item.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{item.value}</div>
                  </CardContent>
                </Card>
              ))
            : Array.from({ length: 4 }).map((_, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Loading…</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Applications</CardTitle>
                <CardDescription>
                  Essays and drafts you've started. Progress updates as you write.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No applications yet. Start from Matches to create your first draft.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scholarship</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Readiness</TableHead>
                        <TableHead>Workload</TableHead>
                        <TableHead>Next Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.draftId}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{app.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {app.provider} • {app.deadline}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={app.progress} className="h-2 w-24" />
                              <span className="text-xs text-muted-foreground">{app.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                app.readiness === 'ready'
                                  ? 'default'
                                  : app.readiness === 'solid'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {app.readiness}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {app.workloadLabel ? (
                              <Badge variant="outline" className="font-normal">
                                {app.workloadLabel}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">n/a</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{app.nextAction}</span>
                              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                <Link to="/scholarship/$id" params={{ id: app.id }}>
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suggestions</CardTitle>
                <CardDescription>
                  Low extra work scholarships based on drafts you've started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No suggestions yet.</p>
                ) : (
                  suggestions.map((s) => (
                    <div key={s.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{s.text}</p>
                        <Badge variant="secondary" className="font-normal">
                          Low effort
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 gap-1 text-xs"
                        asChild
                      >
                        <Link to="/scholarship/$id" params={{ id: s.id }}>
                          Open
                          <Sparkles className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
