import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ExternalLink, FileText, Users } from 'lucide-react'

interface SourcesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scholarshipUrl?: string | null
  winnerCount?: number
}

export function SourcesDrawer({
  open,
  onOpenChange,
  scholarshipUrl,
  winnerCount = 0,
}: SourcesDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[40vh] sm:h-[350px]">
        <SheetHeader className="text-left">
          <SheetTitle>Sources used for this scholarship</SheetTitle>
          <SheetDescription>
            Our AI ingests and classifies data from multiple verified sources to
            ensure accuracy.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              Official Website
            </div>
            <div className="text-sm">
              {scholarshipUrl ? (
                <a
                  href={scholarshipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Visit source
                </a>
              ) : (
                <span className="text-muted-foreground">No URL available</span>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Used for: description, deadlines, requirements
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Curated Database
            </div>
            <div className="text-sm font-medium">Internal Records</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Used for: personality themes, tone analysis
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Winner Stories
            </div>
            <div className="text-sm font-medium">
              {winnerCount} stories analyzed
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Used for: pattern mining, success examples (no text copied)
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
