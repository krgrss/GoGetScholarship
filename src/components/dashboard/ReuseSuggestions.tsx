import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export type ReuseSuggestion = {
  id: string
  scholarshipId: string
  scholarshipName: string
  baseEssayId: string
  baseEssayName: string
  extraWorkEstimateMinutes: number
  plannerHref: string
}

type Props = {
  suggestions: ReuseSuggestion[]
}

export default function ReuseSuggestions({ suggestions }: Props) {
  if (!suggestions.length) {
    return null
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Extra Work Opportunities</CardTitle>
        <CardDescription>
          We compare your essays with our scholarship corpus using embeddings to find low-effort reuse opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{s.scholarshipName}</p>
              <Badge variant="secondary" className="text-[11px]">
                ~{s.extraWorkEstimateMinutes} min tweaks
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Reuses: {s.baseEssayName}</p>
            <Button asChild size="sm" variant="ghost" className="mt-2 h-8 gap-1 text-xs">
              <a href={s.plannerHref}>
                Open suggestion
                <Sparkles className="h-4 w-4" />
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
