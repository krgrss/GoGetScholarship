import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'

import TodayPlan, { TodayTask } from '@/components/dashboard/TodayPlan'
import CycleSummary, { CycleSummaryData } from '@/components/dashboard/CycleSummary'
import SmartPlannerTimeline, { PlannerWeek } from '@/components/dashboard/SmartPlannerTimeline'
import ApplicationsPipeline, { ApplicationRow } from '@/components/dashboard/ApplicationsPipeline'
import ReuseSuggestions, { ReuseSuggestion } from '@/components/dashboard/ReuseSuggestions'
import WeeklyInsight, { WeeklyInsightData } from '@/components/dashboard/WeeklyInsight'
import { AlertCircle, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type DashboardApplication = {
  id: string
  draftId: string
  name: string
  provider: string
  deadline: string
  deadlineIso?: string | null
  status: string
  progress: number
  readiness: 'needs_work' | 'solid' | 'ready'
  nextAction: string
  workloadLabel?: 'Light' | 'Medium' | 'Heavy'
  workloadItems?: string[]
  completed_tasks?: number
  total_tasks?: number
  amountMax?: number
}

type DashboardKpi = {
  total: number
  inProgress: number
  completed: number
  potentialValue: string
}

type DashboardResponse = {
  kpi: DashboardKpi
  applications: DashboardApplication[]
}

function daysUntil(dateIso?: string | null) {
  if (!dateIso) return null
  const target = new Date(dateIso)
  if (Number.isNaN(target.getTime())) return null
  const diff = target.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DashboardPage() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DashboardResponse | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const rawId =
          localStorage.getItem('scholarship_student_id') ||
          localStorage.getItem('student_id') ||
          ''
        const studentId = rawId.trim()
        const uuidRegex =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        if (!studentId || !uuidRegex.test(studentId)) {
          setError('Load a saved student ID first (via Profile/Onboarding) before viewing the dashboard.')
          return
        }

        const res = await fetch(`/api/dashboard?student_id=${encodeURIComponent(studentId)}`)
        const json = await res.json()
        if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to load dashboard')
        setData(json as DashboardResponse)
      } catch (e: any) {
        setError(String(e.message || e))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const applications = data?.applications ?? []

  const todayTasks: TodayTask[] = React.useMemo(() => {
    return applications
      .map((app, idx) => {
        const dueInDays = daysUntil(app.deadlineIso)
        const stageLabel = app.status
        return {
          id: app.draftId || app.id || String(idx),
          scholarshipId: app.id,
          scholarshipName: app.name,
          dueDate: app.deadlineIso || '',
          dueInDays: dueInDays ?? 30 + idx,
          taskLabel: app.nextAction,
          durationMinutes: app.workloadLabel === 'Light' ? 20 : app.workloadLabel === 'Heavy' ? 45 : 30,
          aiRank: idx + 1,
          plannerHref: `/scholarship/${app.id}`,
          stage: stageLabel,
        }
      })
      .sort((a, b) => a.dueInDays - b.dueInDays)
      .slice(0, 3)
  }, [applications])

  const cycleSummary: CycleSummaryData | null = React.useMemo(() => {
    if (!applications.length || !data?.kpi) return null
    const active = applications.filter((a) => a.progress < 100)
    const dueThisWeek = active.filter((a) => {
      const d = daysUntil(a.deadlineIso)
      return d != null && d <= 7
    }).length
    const deadlines30 = active.filter((a) => {
      const d = daysUntil(a.deadlineIso)
      return d != null && d <= 30
    }).length
    const highValue30 = active.filter((a) => {
      const d = daysUntil(a.deadlineIso)
      return d != null && d <= 30 && (a.amountMax ?? 0) >= 5000
    }).length
    const draftsNearlyReady = applications.filter((a) => a.progress >= 60 && a.progress < 100).length
    return {
      activeApplications: active.length,
      activeDueThisWeek: dueThisWeek,
      deadlinesNext30Days: deadlines30,
      highValueDeadlinesNext30Days: highValue30,
      potentialValueActive: data.kpi.potentialValue,
      draftsInProgress: active.length,
      draftsNearlyReady,
    }
  }, [applications, data?.kpi])

  const weeks: PlannerWeek[] = React.useMemo(() => {
    const now = new Date()
    const startOfWeek = (offsetWeeks: number) => {
      const d = new Date(now)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offsetWeeks * 7
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
      return d
    }
    const weekLabels = ['This week', 'Next week', 'Week after']
    return weekLabels.map((label, idx) => {
      const start = startOfWeek(idx)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const tasks = applications.slice(0, 4).map((app, i) => {
        const cat: 'essay' | 'documents' | 'shortAnswer' =
          app.workloadItems?.some((w) => w.toLowerCase().includes('transcript') || w.toLowerCase().includes('rec'))
            ? 'documents'
            : app.workloadItems?.some((w) => w.toLowerCase().includes('short') || w.toLowerCase().includes('answer'))
              ? 'shortAnswer'
              : 'essay'
        return {
          id: `${app.id}-${idx}-${i}`,
          scholarshipId: app.id,
          scholarshipName: app.name,
          taskLabel: app.nextAction || 'Keep progressing',
          durationMinutes: app.workloadLabel === 'Light' ? 20 : app.workloadLabel === 'Heavy' ? 45 : 30,
          category: cat,
          plannerHref: `/scholarship/${app.id}`,
        }
      })
      return {
        weekLabel: label,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        tasks,
      }
    })
  }, [applications])

  const pipelineRows: ApplicationRow[] = React.useMemo(() => {
    return applications
      .map((app) => {
        const dueInDays = daysUntil(app.deadlineIso)
        const stage =
          app.progress >= 100
            ? 'submitted'
            : app.progress >= 70
              ? 'revising'
              : app.progress >= 30
                ? 'drafting'
                : app.total_tasks && app.total_tasks > 0
                  ? 'planning'
                  : 'not_started'
        return {
          id: app.id,
          scholarshipId: app.id,
          scholarshipName: app.name,
          isHighValue: (app.amountMax ?? 0) >= 5000,
          stage: stage as ApplicationRow['stage'],
          readinessPercent: app.progress,
          dueDate: app.deadlineIso || '',
          dueInDays: dueInDays ?? 999,
          primaryActionLabel:
            stage === 'submitted'
              ? 'View'
              : stage === 'revising'
                ? 'Revise draft'
                : stage === 'drafting'
                  ? 'Continue draft'
                  : stage === 'planning'
                    ? 'Open plan'
                    : 'Start planning',
          primaryActionHref: `/scholarship/${app.id}`,
        }
      })
      .sort((a, b) => a.dueInDays - b.dueInDays)
  }, [applications])

  const reuseSuggestions: ReuseSuggestion[] = React.useMemo(() => {
    return applications
      .filter((a) => a.workloadLabel === 'Light' && a.progress >= 20 && a.progress < 100)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        scholarshipId: a.id,
        scholarshipName: a.name,
        baseEssayId: a.draftId,
        baseEssayName: 'Current draft',
        extraWorkEstimateMinutes: 15,
        plannerHref: `/scholarship/${a.id}`,
      }))
  }, [applications])

  const weeklyInsight: WeeklyInsightData | null = React.useMemo(() => {
    if (!applications.length) return null
    const drafts60 = applications.filter((a) => a.progress >= 60 && a.progress < 100).length
    const urgent = applications.filter((a) => {
      const d = daysUntil(a.deadlineIso)
      return d != null && d <= 3
    }).length
    const highValue = applications.filter((a) => (a.amountMax ?? 0) >= 5000).length
    return {
      title: 'Coach’s Weekly Insight',
      bullets: [
        `You have ${drafts60 || 'no'} drafts between 60–99% readiness; polishing them unlocks fast wins.`,
        urgent
          ? `${urgent} deadline${urgent > 1 ? 's' : ''} within 3 days—tackle those first.`
          : 'No ultra-urgent deadlines; focus on readiness and reuse.',
        highValue
          ? `${highValue} high-value scholarships in your pipeline; prioritize their plan tasks.`
          : 'Focus on strongest-fit scholarships and keep reuse in mind.',
      ],
    }
  }, [applications])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/10 pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Today’s game plan, Smart Planner, and AI insights in one place.
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
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodayPlan tasks={todayTasks} loading={loading} />
          </div>
          <CycleSummary data={cycleSummary} loading={loading} />
        </section>

        <SmartPlannerTimeline weeks={weeks} />

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ApplicationsPipeline rows={pipelineRows} loading={loading} />
          </div>
          <div className="space-y-4">
            <ReuseSuggestions suggestions={reuseSuggestions} />
            <WeeklyInsight insight={weeklyInsight} />
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
