import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Lightbulb,
  Mic,
  Sparkles,
  Users,
} from 'lucide-react'
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/scholarship/$id')({
  component: ScholarshipDetailPage,
})

type ApiScholarship = {
  id: string
  name: string
  sponsor: string | null
  url: string | null
  raw_text: string
  min_gpa: number | null
  country: string | null
  fields: string[] | null
  metadata: any
}

type ApiPersonality = {
  weights: Record<string, number>
  themes: string[]
  tone: string
  constraints: string[]
  notes: string[]
} | null

type WinnerPatterns = {
  success_patterns: string[]
  key_themes: string[]
  winner_profile: string
} | null

type ScholarshipView = {
  id: string
  name: string
  provider: string
  amountLabel: string
  frequencyLabel: string
  deadlineLabel: string
  daysLeftLabel: string
  description: string
  eligibilityBullets: string[]
  components: { type: string; label: string; icon: React.ComponentType<any> }[]
  personalityThemes: string[]
  personalityTone: string | null
  winnerPatterns: WinnerPatterns
  url: string | null
}

type PlanTask = {
  id: string
  label: string
  due_date: string | null
}

export function ScholarshipDetailPage() {
  const { id } = Route.useParams()

  const [data, setData] = React.useState<{
    scholarship: ApiScholarship
    personality: ApiPersonality
  } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Explain Fit state
  const [explainFitOpen, setExplainFitOpen] = React.useState(false)
  const [explainFitLoading, setExplainFitLoading] = React.useState(false)
  const [explainFitResult, setExplainFitResult] = React.useState<string | null>(null)

  // Planner state
  const [planLoading, setPlanLoading] = React.useState(false)
  const [planError, setPlanError] = React.useState<string | null>(null)
  const [planTasks, setPlanTasks] = React.useState<PlanTask[]>([])

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/scholarship/${id}`)
        const json = await res.json()
        if (!res.ok || !json.ok) {
          throw new Error(json?.error || 'Failed to load scholarship')
        }
        if (cancelled) return
        setData({
          scholarship: json.scholarship as ApiScholarship,
          personality: (json.personality ?? null) as ApiPersonality,
        })
      } catch (e: any) {
        if (cancelled) return
        setError(String(e.message || e))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleExplainFit = async () => {
    setExplainFitLoading(true)
    setExplainFitResult(null)
    try {
      const studentId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('scholarship_student_id') ||
            localStorage.getItem('student_id'))) ||
        null

      if (!studentId) {
        throw new Error('No saved profile found. Complete onboarding to see a fit explanation.')
      }

      const res = await fetch('/api/explain-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarship_id: id,
          student_id: studentId,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || 'Failed to explain fit')
      }

      const explanation = json.explanation as {
        reasons?: string[]
        eligibility?: string[]
        gaps?: string[]
        score?: number
      }

      const parts: string[] = []
      if (typeof explanation.score === 'number') {
        parts.push(`Overall match score: ${explanation.score}/100`)
      }
      if (Array.isArray(explanation.reasons) && explanation.reasons.length) {
        parts.push('\nReasons this fits you:\n- ' + explanation.reasons.join('\n- '))
      }
      if (Array.isArray(explanation.eligibility) && explanation.eligibility.length) {
        parts.push('\nEligibility notes:\n- ' + explanation.eligibility.join('\n- '))
      }
      if (Array.isArray(explanation.gaps) && explanation.gaps.length) {
        parts.push('\nPotential gaps or risks:\n- ' + explanation.gaps.join('\n- '))
      }

      setExplainFitResult(parts.join('\n\n').trim() || 'No explanation available.')
      setExplainFitOpen(true)
    } catch (e: any) {
      alert(String(e.message || e))
    } finally {
      setExplainFitLoading(false)
    }
  }

  const handlePlanApplication = async () => {
    setPlanLoading(true)
    setPlanError(null)
    setPlanTasks([])
    try {
      const studentId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('scholarship_student_id') ||
            localStorage.getItem('student_id'))) ||
        null

      if (!studentId) {
        throw new Error('No saved profile found. Complete onboarding to create a plan.')
      }

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          scholarship_id: id,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || 'Failed to create application plan')
      }
      const tasks: PlanTask[] = (json.tasks ?? []) as PlanTask[]
      setPlanTasks(tasks)
    } catch (e: any) {
      setPlanError(String(e.message || e))
    } finally {
      setPlanLoading(false)
    }
  }

  const scholarship: ScholarshipView | null = React.useMemo(() => {
    if (!data) return null
    const { scholarship, personality } = data
    const metadata = (scholarship.metadata ?? {}) as any

    const provider =
      (metadata.provider_name as string | undefined) ||
      scholarship.sponsor ||
      'Scholarship provider'

    const amountMin = typeof metadata.amount_min === 'number' ? metadata.amount_min : null
    const amountMax = typeof metadata.amount_max === 'number' ? metadata.amount_max : null
    const currency = typeof metadata.currency === 'string' ? metadata.currency : ''
    let amountLabel = 'See details'
    if (amountMin != null && amountMax != null && currency) {
      if (amountMin === amountMax) {
        amountLabel = `${currency} ${amountMin.toLocaleString()}`
      } else {
        amountLabel = `${currency} ${amountMin.toLocaleString()} - ${amountMax.toLocaleString()}`
      }
    }

    const frequencyLabel =
      (typeof metadata.frequency === 'string' && metadata.frequency) || 'One-time'

    const deadlineRaw =
      (typeof metadata.deadline === 'string' && metadata.deadline) || null
    let deadlineLabel = 'Not specified'
    let daysLeftLabel = ''
    if (deadlineRaw) {
      const d = new Date(deadlineRaw)
      if (!Number.isNaN(d.getTime())) {
        deadlineLabel = d.toLocaleDateString()
        const msPerDay = 1000 * 60 * 60 * 24
        const diffDays = Math.ceil((d.getTime() - Date.now()) / msPerDay)
        if (diffDays > 0) {
          daysLeftLabel = `${diffDays} day${diffDays === 1 ? '' : 's'} left`
        } else if (diffDays === 0) {
          daysLeftLabel = 'Deadline today'
        } else {
          daysLeftLabel = 'Deadline passed'
        }
      } else {
        deadlineLabel = deadlineRaw
      }
    }

    const eligibilityBullets: string[] = []
    const level = metadata.level_of_study as string[] | undefined
    if (level && level.length) {
      eligibilityBullets.push(`Level of study: ${level.join(', ')}`)
    }
    const fieldsOfStudy = metadata.fields_of_study as string[] | undefined
    if (fieldsOfStudy && fieldsOfStudy.length) {
      eligibilityBullets.push(`Fields of study: ${fieldsOfStudy.join(', ')}`)
    }
    const countries = metadata.country_eligibility as string[] | undefined
    if (countries && countries.length) {
      eligibilityBullets.push(`Eligible countries: ${countries.join(', ')}`)
    }
    const citizenship = metadata.citizenship_requirements as string[] | undefined
    if (citizenship && citizenship.length) {
      eligibilityBullets.push(`Citizenship requirements: ${citizenship.join(', ')}`)
    }
    if (metadata.financial_need_required === true) {
      eligibilityBullets.push('Requires demonstrated financial need.')
    }
    if (scholarship.min_gpa != null) {
      eligibilityBullets.push(`Minimum GPA: ${scholarship.min_gpa}`)
    }
    const demographic = metadata.demographic_eligibility as string[] | undefined
    if (demographic && demographic.length && demographic[0] !== 'none_specified') {
      eligibilityBullets.push(`Demographic focus: ${demographic.join(', ')}`)
    }
    const eligibilityRaw = metadata.eligibility_raw as string | undefined
    if (!eligibilityBullets.length && eligibilityRaw) {
      eligibilityBullets.push(eligibilityRaw)
    }

    const components: ScholarshipView['components'] = []
    const appComponents = metadata.application_components as
      | {
          essays?: number
          reference_letters?: number
          transcript_required?: boolean
          resume_required?: boolean
          portfolio_required?: boolean
          interview_possible?: boolean
        }
      | undefined

    if (appComponents) {
      const essays = Number(appComponents.essays ?? 0)
      if (essays > 0) {
        components.push({
          type: 'essay',
          label:
            essays === 1
              ? 'Personal statement essay'
              : `${essays} essays or short answers`,
          icon: FileText,
        })
      }
      const refs = Number(appComponents.reference_letters ?? 0)
      if (refs > 0) {
        components.push({
          type: 'ref',
          label:
            refs === 1 ? '1 reference letter' : `${refs} reference letters`,
          icon: Users,
        })
      }
      if (appComponents.transcript_required) {
        components.push({
          type: 'transcript',
          label: 'Official transcript',
          icon: GraduationCap,
        })
      }
      if (appComponents.resume_required) {
        components.push({
          type: 'resume',
          label: 'Resume or CV',
          icon: BookOpen,
        })
      }
      if (appComponents.portfolio_required) {
        components.push({
          type: 'portfolio',
          label: 'Portfolio',
          icon: Mic,
        })
      }
      if (appComponents.interview_possible) {
        components.push({
          type: 'interview',
          label: 'Possible interview',
          icon: Mic,
        })
      }
    }

    const winnerPatterns = (metadata.winner_patterns as WinnerPatterns) ?? null

    const description =
      (typeof metadata.description_raw === 'string' && metadata.description_raw) ||
      scholarship.raw_text

    return {
      id: scholarship.id,
      name: scholarship.name,
      provider,
      amountLabel,
      frequencyLabel,
      deadlineLabel,
      daysLeftLabel,
      description,
      eligibilityBullets,
      components,
      personalityThemes: (personality?.themes as string[]) ?? [],
      personalityTone: personality?.tone ?? null,
      winnerPatterns,
      url: scholarship.url,
    }
  }, [data])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-12">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          to="/matches"
          className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Matches
        </Link>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          {/* Left Column */}
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                {scholarship?.name ?? (loading ? 'Loading scholarship…' : 'Scholarship')}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {scholarship?.provider}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {scholarship?.amountLabel ?? 'Amount TBA'}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {scholarship?.frequencyLabel ?? 'One-time'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Deadline: {scholarship?.deadlineLabel}</span>
                  {scholarship?.daysLeftLabel && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {scholarship.daysLeftLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">About this scholarship</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExplainFit}
                  disabled={explainFitLoading}
                >
                  {explainFitLoading ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Explain Fit
                    </>
                  )}
                </Button>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                {scholarship?.description}
              </p>
              <Button variant="link" className="h-auto p-0 text-primary" asChild>
                <a
                  href={scholarship?.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View official page <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </section>

            {/* Explain Fit Dialog */}
            <Dialog open={explainFitOpen} onOpenChange={setExplainFitOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Why This Scholarship Fits You</DialogTitle>
                  <DialogDescription>
                    AI-powered analysis of your profile match with this scholarship
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {explainFitResult ? (
                    <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {explainFitResult}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No explanation available.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Eligibility</h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {(scholarship?.eligibilityBullets ?? []).map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                    {!loading &&
                      scholarship &&
                      scholarship.eligibilityBullets.length === 0 && (
                        <li className="text-sm text-muted-foreground">
                          Eligibility details are not fully specified in our dataset. Check
                          the official page to confirm the latest criteria.
                        </li>
                      )}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Column (Sticky) */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  How to stand out here
                </CardTitle>
                <CardDescription className="text-xs">
                  Personality and winner patterns inferred from the official description and
                  public recipient stories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Core themes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(scholarship?.personalityThemes ?? []).map((theme) => (
                      <Badge
                        key={theme}
                        variant="secondary"
                        className="rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {theme}
                      </Badge>
                    ))}
                    {scholarship &&
                      scholarship.personalityThemes.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Run the personality profiler for this scholarship to see what it
                          really cares about.
                        </p>
                      )}
                  </div>
                </div>

                {scholarship?.winnerPatterns && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Winner patterns
                    </p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {scholarship.winnerPatterns.success_patterns.map((p, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {scholarship?.winnerPatterns && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        View typical winner profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Typical winner profile</DialogTitle>
                        <DialogDescription className="text-xs">
                          High-level, anonymized description based on public recipient
                          stories.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        <p className="leading-relaxed">
                          {scholarship.winnerPatterns.winner_profile}
                        </p>
                        <Separator />
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Key themes
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {scholarship.winnerPatterns.key_themes.map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="rounded-full px-2 py-0.5 text-[11px]"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
              <CardFooter className="border-t bg-muted/40 px-4 py-3">
                <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
                  <span>Based on curated data, not scraped web content.</span>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Application components</CardTitle>
                <CardDescription className="text-xs">
                  What you’ll likely need to submit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(scholarship?.components ?? []).length > 0 ? (
                  <ul className="space-y-2">
                    {scholarship?.components.map((c) => (
                      <li key={c.type} className="flex items-center gap-2 text-xs">
                        <c.icon className="h-4 w-4 text-primary" />
                        <span>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Components for this scholarship are not fully structured yet. Check the
                    official page for the latest list of essays, references, and other
                    materials.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Plan your application</CardTitle>
                <CardDescription className="text-xs">
                  Generate a tailored plan of tasks and then track progress from your
                  dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  We&apos;ll use this scholarship&apos;s components and deadline to suggest a
                  lightweight task list (essays, references, transcript, and more).
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={handlePlanApplication}
                    disabled={planLoading}
                  >
                    {planLoading ? (
                      <>
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Creating plan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Plan this scholarship
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                    <Link to="/essay/$id" params={{ id }}>
                      <FileText className="h-3 w-3" />
                      Draft essay
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1 text-xs" asChild>
                    <Link to="/dashboard">
                      Go to dashboard
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>

                {planError && (
                  <p className="text-[11px] text-destructive">{planError}</p>
                )}

                {planTasks.length > 0 && (
                  <div className="space-y-2 rounded-md bg-muted/40 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Suggested tasks
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                      {planTasks.map((task) => (
                        <li key={task.id} className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                            <span>{task.label}</span>
                          </div>
                          {task.due_date && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              Due {task.due_date}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
