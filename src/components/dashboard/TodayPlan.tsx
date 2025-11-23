import { ArrowUpRight, Sparkles, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export type TodayTask = {
  id: string
  scholarshipId: string
  scholarshipName: string
  dueDate: string
  dueInDays: number | null
  taskLabel: string
  durationMinutes: number
  aiRank: number
  plannerHref: string
  stage?: string
}

type Props = {
  tasks: TodayTask[]
  loading?: boolean
}

function dueLabel(days: number | null) {
  if (days == null) return 'No deadline'
  if (days <= 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

export default function TodayPlan({ tasks, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Today’s Game Plan</CardTitle>
            <CardDescription>Prioritized by AI based on deadlines, value, and effort.</CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px]">
            Smart Planner
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No urgent tasks today. You can still review your planner or explore new matches.
          </p>
        ) : (
          tasks.map((task, idx) => (
            <div key={task.id} className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Badge variant="secondary" className="text-[11px]">
                      AI-ranked #{idx + 1}
                    </Badge>
                    {task.stage ? <span>{task.stage}</span> : null}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{task.scholarshipName}</div>
                  <div className="text-xs text-muted-foreground">{task.taskLabel}</div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={task.dueInDays != null && task.dueInDays <= 2 ? 'text-destructive' : ''}>
                      <Clock className="mr-1 inline h-3 w-3" />
                      {dueLabel(task.dueInDays)}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>~{task.durationMinutes} min</span>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <a href={task.plannerHref}>
                    Open in planner
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Smart Planner looks at deadlines, value, and effort to rank today’s tasks.
        </div>
      </CardContent>
    </Card>
  )
}
