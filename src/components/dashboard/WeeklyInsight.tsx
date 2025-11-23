import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

export type WeeklyInsightData = {
  title: string
  bullets: string[]
}

type Props = {
  insight: WeeklyInsightData | null
}

export default function WeeklyInsight({ insight }: Props) {
  if (!insight) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{insight.title}</CardTitle>
        <CardDescription>AI looks across your drafts, deadlines, and planner to highlight where a bit more effort gives the biggest return.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {insight.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 text-primary" />
            <span>{b}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
