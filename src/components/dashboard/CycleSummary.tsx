import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type CycleSummaryData = {
  activeApplications: number
  activeDueThisWeek: number
  deadlinesNext30Days: number
  highValueDeadlinesNext30Days: number
  potentialValueActive: string
  draftsInProgress: number
  draftsNearlyReady: number
}

type Props = {
  data: CycleSummaryData | null
  loading?: boolean
}

const rows = (data: CycleSummaryData) => [
  {
    label: 'Active applications',
    value: `${data.activeApplications} active`,
    detail: `${data.activeDueThisWeek} due this week`,
  },
  {
    label: 'Deadlines (next 30 days)',
    value: `${data.deadlinesNext30Days} total`,
    detail: `${data.highValueDeadlinesNext30Days} high-value`,
  },
  {
    label: 'Potential value (active)',
    value: data.potentialValueActive,
    detail: '',
  },
  {
    label: 'Drafts in progress',
    value: `${data.draftsInProgress} drafts`,
    detail: `${data.draftsNearlyReady} nearly ready`,
  },
]

export default function CycleSummary({ data, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Cycle Overview</CardTitle>
        <CardDescription>Quick pulse on your current cycle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">No active applications yet.</p>
        ) : (
          rows(data).map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                {row.detail && <p className="text-[11px] text-muted-foreground">{row.detail}</p>}
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {row.value}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
