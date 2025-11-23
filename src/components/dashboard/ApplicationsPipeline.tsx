import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowRight, Info } from 'lucide-react'

export type ApplicationStage = 'not_started' | 'planning' | 'drafting' | 'revising' | 'submitted'

export type ApplicationRow = {
  id: string
  scholarshipId: string
  scholarshipName: string
  isHighValue: boolean
  stage: ApplicationStage
  readinessPercent: number | null
  dueDate: string
  dueInDays: number
  primaryActionLabel: string
  primaryActionHref: string
}

type Props = {
  rows: ApplicationRow[]
  loading?: boolean
}

function stageChip(stage: ApplicationStage) {
  const map: Record<ApplicationStage, string> = {
    not_started: 'Not started',
    planning: 'Planning',
    drafting: 'Drafting',
    revising: 'Revising',
    submitted: 'Submitted',
  }
  return map[stage] || stage
}

function dueColor(dueInDays: number) {
  if (dueInDays <= 2) return 'text-destructive'
  if (dueInDays <= 7) return 'text-amber-600'
  return 'text-muted-foreground'
}

export default function ApplicationsPipeline({ rows, loading }: Props) {
  const dateLabel = (d: string) => {
    if (!d) return 'No deadline'
    const dt = new Date(d)
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString()
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Applications Pipeline</CardTitle>
        <CardDescription>Track where each scholarship is in your process.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No applications yet. Start from Matches to create your first draft.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scholarship</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-center">Readiness</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.scholarshipName}</span>
                        {row.isHighValue ? (
                          <Badge variant="secondary" className="text-[11px]">
                            High value
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{dateLabel(row.dueDate)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {stageChip(row.stage)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.readinessPercent != null ? (
                      <div className="inline-flex items-center gap-1 text-sm font-semibold">
                        {row.readinessPercent}%
                        <Info className="h-3 w-3 text-muted-foreground" />
                        <span className="sr-only">Estimated by AI against this scholarship’s rubric.</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Not assessed</span>
                    )}
                  </TableCell>
                  <TableCell className={dueColor(row.dueInDays)}>
                    {row.dueInDays >= 999 ? 'No deadline' : `Due in ${row.dueInDays} days`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 gap-1">
                      <a href={row.primaryActionHref}>
                        {row.primaryActionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
