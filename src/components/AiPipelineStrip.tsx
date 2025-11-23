import { CheckCircle2, Circle, AlertTriangle, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PipelineStep = 'profile' | 'match' | 'personality' | 'draft' | 'grade'

interface AiPipelineStripProps {
  completedSteps: PipelineStep[]
  currentStep?: PipelineStep
  errorStep?: PipelineStep
  onStepClick?: (step: PipelineStep) => void
}

export function AiPipelineStrip({
  completedSteps,
  currentStep,
  errorStep,
  onStepClick,
}: AiPipelineStripProps) {
  const steps: { id: PipelineStep; label: string; tooltip: string }[] = [
    { id: 'profile', label: 'Profile', tooltip: 'Loaded from /api/profile via studentId' },
    { id: 'match', label: 'Match', tooltip: 'Ranked via /api/match + /api/rerank with embeddings' },
    { id: 'personality', label: 'Personality', tooltip: 'Personality profile cached from /api/personality' },
    { id: 'draft', label: 'Draft', tooltip: 'Essay workspace connected to /api/draft' },
    { id: 'grade', label: 'Grade', tooltip: 'Rubric grading from /api/grade-essay' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id)
        const isError = errorStep === step.id
        const isCurrent = currentStep === step.id
        const isClickable = ['personality', 'draft', 'grade'].includes(step.id)

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={cn(
                'group relative flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                isCompleted
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : isError
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : isCurrent
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
                isClickable && 'cursor-pointer',
                !isClickable && 'cursor-default'
              )}
              title={step.tooltip}
            >
              {isError ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : isCurrent ? (
                <PlayCircle className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              {step.label}
            </button>
            {index < steps.length - 1 && (
              <div className="mx-2 h-px w-4 bg-border" />
            )}
          </div>
        )
      })}
    </div>
  )
}
