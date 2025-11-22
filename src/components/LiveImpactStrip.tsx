import { Zap } from 'lucide-react'

interface LiveImpactStripProps {
  matchesUnlocked: number
}

export function LiveImpactStrip({ matchesUnlocked }: LiveImpactStripProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
      <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
      <span>Estimated matches unlocked: {matchesUnlocked}</span>
    </div>
  )
}
