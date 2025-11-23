import { ArrowUpRight, Clock, FileText, ListChecks, Scroll } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type PlannerTaskCategory = 'essay' | 'documents' | 'shortAnswer'

export type PlannerWeek = {
  weekLabel: string
  startDate: string
  endDate: string
  tasks: {
    id: string
    scholarshipId: string
    scholarshipName: string
    taskLabel: string
    durationMinutes: number
    category: PlannerTaskCategory
    plannerHref: string
  }[]
}

type Props = {
  weeks: PlannerWeek[]
}

function categoryBadge(cat: PlannerTaskCategory) {
  switch (cat) {
    case 'essay':
      return (
        <Badge variant="secondary" className="text-[10px]">
          Essay
        </Badge>
      )
    case 'documents':
      return (
        <Badge variant="outline" className="text-[10px]">
          Documents
        </Badge>
      )
    case 'shortAnswer':
      return (
        <Badge variant="secondary" className="text-[10px]">
          Short answers
        </Badge>
      )
  }
}

export default function SmartPlannerTimeline({ weeks }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle>Smart Planner Timeline</CardTitle>
          <CardDescription>
            AI breaks each scholarship into tasks and spreads them across your weeks.
          </CardDescription>
        </div>
        {weeks.length > 0 && weeks[0]?.tasks?.[0]?.scholarshipId ? (
          <Button asChild size="sm" variant="outline">
            <a href={`/scholarship/${weeks[0].tasks[0].scholarshipId}`}>
              View full planner
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Planner data will appear once you start applications.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {weeks.map((week) => (
              <div key={week.weekLabel} className="min-w-[240px] flex-1 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{week.weekLabel}</p>
                  <Badge variant="outline" className="text-[11px]">
                    {new Date(week.startDate).toLocaleDateString()} – {new Date(week.endDate).toLocaleDateString()}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {week.tasks.slice(0, 4).map((t) => (
                    <div key={t.id} className="rounded-md border bg-background p-2">
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <span className="truncate">{t.scholarshipName}</span>
                        {categoryBadge(t.category)}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.taskLabel}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          <Clock className="mr-1 inline h-3 w-3" />
                          ~{t.durationMinutes} min
                        </span>
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                          <a href={t.plannerHref}>Open</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
            <FileText className="h-3 w-3" />
            Essay work
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <ListChecks className="h-3 w-3" />
            Documents
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Scroll className="h-3 w-3" />
            Short answers
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
