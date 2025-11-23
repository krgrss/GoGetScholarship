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
  Mic,
  Sparkles,
  ListTodo,
  Target,
  Users,
} from 'lucide-react'
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/scholarship/$id')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const studentId = localStorage.getItem('scholarship_student_id') || localStorage.getItem('student_id')
      if (!studentId) {
        window.location.href = '/login'
        throw new Error('Redirecting to login')
      }
    }
  },
  component: ScholarshipDetailPage,
  validateSearch: (search) => {
    const raw = Number((search as any)?.score)
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : undefined
    const eligibility = (search as any)?.eligibility
    const eligibilityFlag =
      eligibility === 'ineligible' || eligibility === 'eligible' ? eligibility : undefined
    return { score, eligibility: eligibilityFlag }
  },
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
  winners?: WinnerStory[]
}

type ApiPersonality = {
  weights: Record<string, number>
  themes: string[]
  tone: string
  constraints: string[]
  notes: string[]
} | null

type RubricItem = {
  id: string
  name: string
  description?: string
  weight?: number
}

type WinnerPatterns = {
  success_patterns: string[]
  key_themes: string[]
  winner_profile: string
} | null

type WinnerStory = {
  winner_name?: string | null
  year?: number | null
  story_excerpt?: string | null
  themes?: string[] | null
  angle?: string | null
  source_url?: string | null
}

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
  workloadLabel: 'Light' | 'Medium' | 'Heavy'
  workloadItems: string[]
  taskSeeds: PlanTask[]
  personalityThemes: string[]
  personalityTone: string | null
  winnerPatterns: WinnerPatterns
  winners: WinnerStory[]
  url: string | null
  academicSummary: string
  geographicSummary: string
  demographicSummary: string
}

type PlanTask = {
  id: string
  label: string
  due_date: string | null
  completed?: boolean
}

function normalizeValue(value?: string | null) {
  return value ? value.trim().toLowerCase() : ''
}

function formatLabel(text?: string | null) {
  if (!text) return ''
  return String(text).replace(/_/g, ' ')
}

function normalizeCountry(value?: string | null) {
  const v = normalizeValue(value)
  const map: Record<string, string> = {
    us: 'us',
    usa: 'us',
    'united states': 'us',
    united_states: 'us',
    ca: 'ca',
    canada: 'ca',
    uk: 'uk',
    'united kingdom': 'uk',
    gb: 'uk',
    australia: 'au',
    au: 'au',
  }
  return map[v] || v
}

function normalizeGpa(profile?: any): number | undefined {
  if (!profile) return undefined
  const raw = profile.gpa ? Number(profile.gpa) : NaN
  const scale = profile.gpaScale ? Number(profile.gpaScale) : 4
  if (Number.isNaN(raw)) return undefined
  if (!scale || scale === 4 || scale === 4.0) return raw
  if (scale === 100) return Number((raw / 25).toFixed(2))
  return raw
}

function evaluateEligibility(scholarship?: ApiScholarship | null, profile?: any | null) {
  if (!scholarship || !profile) return { status: 'unknown' as const, reasons: [] as string[] }
  const reasons: string[] = []
  let ineligible = false

  const profileCountry = normalizeCountry(profile.country)
  const profileCitizenship = normalizeValue(profile.citizenship)
  const profileGpa = normalizeGpa(profile)
  const profileTags: string[] = Array.isArray(profile.backgroundTags)
    ? profile.backgroundTags.map(normalizeValue).filter(Boolean)
    : []

  const countryEligibility = Array.isArray((scholarship.metadata as any)?.country_eligibility)
    ? ((scholarship.metadata as any).country_eligibility as string[]).map(normalizeCountry)
    : []
  const scholarshipCountry = normalizeCountry(
    scholarship.country || (scholarship.metadata as any)?.source_country,
  )
  if (profileCountry) {
    if (countryEligibility.length && !countryEligibility.includes(profileCountry)) {
      ineligible = true
      reasons.push('Country not in eligibility list')
    } else if (scholarshipCountry && scholarshipCountry !== profileCountry) {
      reasons.push('Different country focus')
    }
  }

  if (typeof scholarship.min_gpa === 'number' && profileGpa !== undefined && profileGpa < scholarship.min_gpa) {
    ineligible = true
    reasons.push('GPA below minimum')
  }

  const citizenshipReq = Array.isArray((scholarship.metadata as any)?.citizenship_requirements)
    ? ((scholarship.metadata as any).citizenship_requirements as string[]).map(normalizeValue)
    : []
  if (profileCitizenship && citizenshipReq.length && !citizenshipReq.includes(profileCitizenship)) {
    ineligible = true
    reasons.push('Citizenship requirement not met')
  }

  const demographicReq = Array.isArray((scholarship.metadata as any)?.demographic_eligibility)
    ? ((scholarship.metadata as any).demographic_eligibility as string[])
        .map(normalizeValue)
        .filter((t) => t && t !== 'none_specified')
    : []
  if (demographicReq.length && profileTags.length) {
    const overlap = demographicReq.some((t) => profileTags.includes(t))
    if (!overlap) {
      ineligible = true
      reasons.push('Demographic requirement not met')
    }
  }

  return { status: ineligible ? ('ineligible' as const) : ('eligible' as const), reasons }
}

export function ScholarshipDetailPage() {
  const { id } = Route.useParams()
  const { score, eligibility: eligibilityFlag } = Route.useSearch()

  const [data, setData] = React.useState<{
    scholarship: ApiScholarship
    personality: ApiPersonality
    winners: WinnerStory[]
  } | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Explain Fit state
  const [explainFitOpen, setExplainFitOpen] = React.useState(false)
  const [explainFitLoading, setExplainFitLoading] = React.useState(false)
  const [explainFitResult, setExplainFitResult] = React.useState<string | null>(null)
  const [explainFitRaw, setExplainFitRaw] = React.useState<any | null>(null)
  const [showExplainFitJson, setShowExplainFitJson] = React.useState(false)
  const [rubric, setRubric] = React.useState<RubricItem[] | null>(null)
  const [reviseCriterionId, setReviseCriterionId] = React.useState<string>('')
  const [reviseText, setReviseText] = React.useState('')
  const [reviseLoading, setReviseLoading] = React.useState(false)
  const [reviseError, setReviseError] = React.useState<string | null>(null)
  const [revisedText, setRevisedText] = React.useState<string | null>(null)
  const [reviseRationale, setReviseRationale] = React.useState<string | null>(null)

  // Planner state
  const [planLoading, setPlanLoading] = React.useState(false)
  const [planError, setPlanError] = React.useState<string | null>(null)
  const [planTasks, setPlanTasks] = React.useState<PlanTask[]>([])
  const [localTasks, setLocalTasks] = React.useState<PlanTask[]>([])
  const [essayText, setEssayText] = React.useState('')
  const [draftLoading, setDraftLoading] = React.useState(false)
  const [draftError, setDraftError] = React.useState<string | null>(null)
  const [gradeLoading, setGradeLoading] = React.useState(false)
  const [gradeError, setGradeError] = React.useState<string | null>(null)
  const [gradeResult, setGradeResult] = React.useState<{
    readiness: string
    criteria: { id: string; name: string; score: number; max: number; feedback: string }[]
    overall_comment: string
  } | null>(null)
  const [genericEssay, setGenericEssay] = React.useState('')
  const [compareLoading, setCompareLoading] = React.useState(false)
  const [compareError, setCompareError] = React.useState<string | null>(null)
  const [compareResult, setCompareResult] = React.useState<{
    generic?: {
      readiness: string
      criteria: { id: string; name: string; score: number; max: number; feedback: string }[]
    }
    tailored?: {
      readiness: string
      criteria: { id: string; name: string; score: number; max: number; feedback: string }[]
    }
  }>({})
  const [strategyStory, setStrategyStory] = React.useState('')
  const [sourcesOpen, setSourcesOpen] = React.useState(false)
  const [eligibilityInfoOpen, setEligibilityInfoOpen] = React.useState(false)
  const [profileJson, setProfileJson] = React.useState<any | null>(null)

  const [profileAvailable, setProfileAvailable] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const idFromStorage =
      localStorage.getItem('scholarship_student_id') || localStorage.getItem('student_id')
    setProfileAvailable(!!idFromStorage)
  }, [])

  const personalityWeights = React.useMemo(() => {
    const weights = data?.personality?.weights
    if (!weights) return []
    const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const max = entries[0]?.[1] ?? 1
    return entries.map(([key, value]) => ({
      key,
      value,
      pct: Math.min(100, Math.round((value / (max || 1)) * 100)),
    }))
  }, [data?.personality?.weights])

  const aiBusy =
    draftLoading ||
    gradeLoading ||
    explainFitLoading ||
    planLoading ||
    compareLoading ||
    reviseLoading

  const aiStatus = React.useMemo(() => {
    if (draftLoading) return 'Drafting with AI...'
    if (gradeLoading) return 'Grading against rubric...'
    if (compareLoading) return 'Comparing essays...'
    if (explainFitLoading) return 'Analyzing fit...'
    if (planLoading) return 'Building plan...'
    if (reviseLoading) return 'Revising by criterion...'
    return ''
  }, [draftLoading, gradeLoading, compareLoading, explainFitLoading, planLoading, reviseLoading])

  const displayMatchScore =
    typeof score === 'number' && Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : null

  const eligibilityStatus = React.useMemo(
    () => evaluateEligibility(data?.scholarship ?? null, profileJson),
    [data?.scholarship, profileJson],
  )
  const isIneligible =
    eligibilityFlag === 'ineligible' || eligibilityStatus.status === 'ineligible'
  const effectiveMatchScore = isIneligible ? 0 : displayMatchScore
  const matchFitLabel =
    effectiveMatchScore != null
      ? effectiveMatchScore >= 75
        ? 'High fit'
        : effectiveMatchScore >= 50
          ? 'Medium fit'
          : 'Lower fit'
      : isIneligible
        ? 'Likely ineligible'
        : 'Not ranked'

  const pipeline = React.useMemo(
    () =>
      [
        {
          label: 'Profile',
          status: profileAvailable ? 'done' : 'available',
          hint: 'Loaded from /api/profile via studentId.',
          anchor: '#profile-match',
        },
        {
          label: 'Match',
          status: 'done',
          hint: 'Ranked via /api/match + /api/rerank with embeddings.',
          anchor: '#profile-match',
        },
        {
          label: 'Personality',
          status: data?.personality ? 'done' : 'available',
          hint: 'Personality profile cached from /api/personality.',
          anchor: '#strategy-step',
        },
        {
          label: 'Draft',
          status: essayText ? 'done' : 'available',
          hint: 'Essay workspace connected to /api/draft.',
          anchor: '#draft-step',
        },
        {
          label: 'Grade',
          status: gradeResult ? 'done' : 'available',
          hint: 'Rubric grading from /api/grade-essay.',
          anchor: '#grade-step',
        },
      ] as { label: string; status: 'done' | 'available'; hint: string; anchor: string }[],
    [data?.personality, essayText, gradeResult, profileAvailable],
  )


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

    const taskSeeds: PlanTask[] = []
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
        taskSeeds.push({
          id: 'essay',
          label: `${essays} essay${essays === 1 ? '' : 's'} to draft`,
          due_date: null,
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
        taskSeeds.push({
          id: 'refs',
          label: `${refs} reference letter${refs === 1 ? '' : 's'} to request`,
          due_date: null,
        })
      }
      if (appComponents.transcript_required) {
        components.push({
          type: 'transcript',
          label: 'Official transcript',
          icon: GraduationCap,
        })
        taskSeeds.push({ id: 'transcript', label: 'Order transcript', due_date: null })
      }
      if (appComponents.resume_required) {
        components.push({
          type: 'resume',
          label: 'Resume or CV',
          icon: BookOpen,
        })
        taskSeeds.push({ id: 'resume', label: 'Update resume/CV', due_date: null })
      }
      if (appComponents.portfolio_required) {
        components.push({
          type: 'portfolio',
          label: 'Portfolio',
          icon: Mic,
        })
        taskSeeds.push({ id: 'portfolio', label: 'Assemble portfolio', due_date: null })
      }
      if (appComponents.interview_possible) {
        components.push({
          type: 'interview',
          label: 'Possible interview',
          icon: Mic,
        })
        taskSeeds.push({ id: 'interview', label: 'Prep for interview', due_date: null })
      }
    }

    // Derive workload label/items from components
    const workloadItems: string[] = []
    let workloadScore = 0
    const essaysCount = Number(appComponents?.essays ?? 0)
    const refsCount = Number(appComponents?.reference_letters ?? 0)
    if (essaysCount) {
      workloadItems.push(`${essaysCount} essay${essaysCount === 1 ? '' : 's'}`)
      workloadScore += essaysCount * 2
    }
    if (refsCount) {
      workloadItems.push(`${refsCount} rec${refsCount === 1 ? '' : 's'}`)
      workloadScore += refsCount
    }
    if (appComponents?.transcript_required) {
      workloadItems.push('Transcript')
      workloadScore += 1
    }
    if (appComponents?.resume_required) {
      workloadItems.push('Resume')
      workloadScore += 1
    }
    if (appComponents?.portfolio_required) {
      workloadItems.push('Portfolio')
      workloadScore += 2
    }
    if (appComponents?.interview_possible) {
      workloadItems.push('Interview')
      workloadScore += 2
    }
    let workloadLabel: 'Light' | 'Medium' | 'Heavy' = 'Medium'
    if (workloadScore <= 2) workloadLabel = 'Light'
    else if (workloadScore >= 5) workloadLabel = 'Heavy'

    const winnerPatterns = (metadata.winner_patterns as WinnerPatterns) ?? null

    const description =
      (typeof metadata.description_raw === 'string' && metadata.description_raw) ||
      scholarship.raw_text

    const demographicRaw =
      (metadata.demographic_requirements as string[]) ??
      (metadata.demographics as string[]) ??
      []

    const academicSummary =
      (scholarship.min_gpa != null || (level && level.length)) && essaysCount > 0
        ? 'Academic: requirements listed'
        : scholarship.min_gpa != null || (level && level.length)
          ? 'Academic: requirements listed'
          : 'Academic: not specified'
    const geographicSummary =
      countries && countries.length
        ? `Geographic: ${countries.length} region${countries.length === 1 ? '' : 's'} listed`
        : 'Geographic: not specified'
    const demographicSummary =
      demographicRaw && demographicRaw.length
        ? `Demographic: ${demographicRaw.join(', ')}`
        : 'Demographic: Optional / not required'

    const winners: WinnerStory[] = Array.isArray(data?.winners) ? data.winners : []

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
      workloadLabel,
      workloadItems,
      taskSeeds,
      personalityThemes: (personality?.themes as string[]) ?? [],
      personalityTone: personality?.tone ?? null,
      winnerPatterns,
      winners,
      url: scholarship.url,
      academicSummary,
      geographicSummary,
      demographicSummary,
    }
  }, [data])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedProfile =
          localStorage.getItem('scholarship_profile') ||
          localStorage.getItem('profile') ||
          null
        if (storedProfile) {
          setProfileJson(JSON.parse(storedProfile))
        }
      } catch {
        // ignore
      }
    }
  }, [])

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
          winners: Array.isArray(json.scholarship?.winners) ? (json.scholarship.winners as WinnerStory[]) : [],
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

  React.useEffect(() => {
    let cancelled = false
    async function loadRubric() {
      try {
        const res = await fetch(`/api/rubric?scholarship_id=${encodeURIComponent(id)}`)
        const json = await res.json()
        if (!res.ok || !json.ok) return
        if (cancelled) return
        const items = (json.rubric as RubricItem[]) ?? []
        setRubric(items)
        if (items.length && !reviseCriterionId) {
          setReviseCriterionId(items[0].id)
        }
      } catch {
        // ignore rubric load failure in UI
      }
    }
    void loadRubric()
    return () => {
      cancelled = true
    }
  }, [id, reviseCriterionId])

  const handleExplainFit = async () => {
    setExplainFitLoading(true)
    setExplainFitResult(null)
    setExplainFitRaw(null)
    setShowExplainFitJson(false)
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

      setExplainFitRaw(explanation)
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
      const msg = String(e.message || e)
      setPlanError(msg)
      // Fall back to local planner seeds so the UI still works when the DB schema is missing.
      if (!planTasks.length && localTasks.length === 0) {
        resetLocalTasks()
      }
    } finally {
      setPlanLoading(false)
    }
  }

  React.useEffect(() => {
    if (!scholarship) return
    const key = `planner_tasks_${scholarship.id}`
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(key)
        if (saved) {
          const parsed = JSON.parse(saved) as PlanTask[]
          setLocalTasks(parsed)
          return
        }
        if (scholarship.taskSeeds?.length) {
          setLocalTasks(
            scholarship.taskSeeds.map((t) => ({
              ...t,
              completed: false,
            })),
          )
        }
      }
    } catch (e) {
      // ignore parse errors, will fall back to seeds
    }
  }, [scholarship])

  function toggleLocalTask(id: string) {
    setLocalTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      )
      if (typeof window !== 'undefined' && scholarship) {
        localStorage.setItem(`planner_tasks_${scholarship.id}`, JSON.stringify(next))
      }
      return next
    })
  }

  function resetLocalTasks() {
    if (!scholarship) return
    const seeds =
      scholarship.taskSeeds?.map((t) => ({ ...t, completed: false })) ?? []
    setLocalTasks(seeds)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`planner_tasks_${scholarship.id}`, JSON.stringify(seeds))
    }
  }

  async function handleRevise() {
    if (!reviseText || !reviseCriterionId || !rubric?.length) {
      setReviseError('Add text and select a criterion first.')
      return
    }
    setReviseLoading(true)
    setReviseError(null)
    setRevisedText(null)
    setReviseRationale(null)
    try {
      const res = await fetch('/api/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: reviseText,
          rubric,
          criterion_id: reviseCriterionId,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `Revise failed (${res.status})`)
      }
      setRevisedText(json.revised_text)
      setReviseRationale(json.rationale ?? null)
    } catch (e: any) {
      setReviseError(String(e.message || e))
    } finally {
      setReviseLoading(false)
    }
  }

  function acceptRevision() {
    if (!revisedText) return
    setReviseText(revisedText)
    setRevisedText(null)
    setReviseRationale(null)
  }

  async function handleDraft() {
    if (!scholarship) {
      setDraftError('Scholarship not loaded yet.')
      return
    }
    if (!data?.personality) {
      setDraftError('No personality profile found for this scholarship.')
      return
    }
    setDraftLoading(true)
    setDraftError(null)
    try {
      const adminKey =
        (typeof window !== 'undefined' && localStorage.getItem('admin_key')) || ''
      const storedProfile =
        (typeof window !== 'undefined' &&
          localStorage.getItem('scholarship_profile') &&
          JSON.parse(localStorage.getItem('scholarship_profile') || '{}')) ||
        {}
      const studentId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('scholarship_student_id') ||
            localStorage.getItem('student_id'))) ||
        undefined

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'admin-api-key': adminKey } : {}),
        },
        body: JSON.stringify({
          scholarship_id: scholarship.id,
          scholarship_name: scholarship.name,
          scholarship_text: scholarship.description,
          personality: data.personality,
          rubric: rubric ?? [],
          student_id: studentId || undefined,
          student_profile: {
            name: storedProfile.name,
            gpa: storedProfile.gpa ? Number(storedProfile.gpa) : undefined,
            major: storedProfile.major,
            country: storedProfile.country,
            activities: [],
            awards: [],
            projects: [],
            background: storedProfile.backgroundTags || [],
            stories: storedProfile.stories ? [storedProfile.stories] : [],
          },
          word_target: 350,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `Draft failed (${res.status})`)
      }
      setEssayText(json.draft || '')
    } catch (e: any) {
      setDraftError(String(e.message || e))
    } finally {
      setDraftLoading(false)
    }
  }

  async function handleGrade() {
    if (!essayText.trim()) {
      setGradeError('Add essay text first.')
      return
    }
    if (!rubric || rubric.length === 0) {
      setGradeError('No rubric available for this scholarship.')
      return
    }
    setGradeLoading(true)
    setGradeError(null)
    setGradeResult(null)
    try {
      const adminKey =
        (typeof window !== 'undefined' && localStorage.getItem('admin_key')) || ''
      const res = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'admin-api-key': adminKey } : {}),
        },
        body: JSON.stringify({
          text: essayText,
          rubric,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `Grade failed (${res.status})`)
      }
      setGradeResult(json.result)
    } catch (e: any) {
      setGradeError(String(e.message || e))
    } finally {
      setGradeLoading(false)
    }
  }

  async function handleCompareGrade() {
    if (!genericEssay.trim() || !essayText.trim()) {
      setCompareError('Add both generic and tailored essays first.')
      return
    }
    if (!rubric || rubric.length === 0) {
      setCompareError('No rubric available to compare.')
      return
    }
    setCompareLoading(true)
    setCompareError(null)
    setCompareResult({})
    try {
      const adminKey =
        (typeof window !== 'undefined' && localStorage.getItem('admin_key')) || ''

      const gradeOne = async (text: string) => {
        const res = await fetch('/api/grade-essay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminKey ? { 'admin-api-key': adminKey } : {}),
          },
          body: JSON.stringify({ text, rubric }),
        })
        const json = await res.json()
        if (!res.ok || !json.ok) {
          throw new Error(json?.error || `Grade failed (${res.status})`)
        }
        return json.result as {
          readiness: string
          criteria: { id: string; name: string; score: number; max: number; feedback: string }[]
        }
      }

      const [genericRes, tailoredRes] = await Promise.all([
        gradeOne(genericEssay),
        gradeOne(essayText),
      ])
      setCompareResult({
        generic: genericRes,
        tailored: tailoredRes,
      })
    } catch (e: any) {
      setCompareError(String(e.message || e))
    } finally {
      setCompareLoading(false)
    }
  }

  const tasksToShow = planTasks.length ? planTasks : localTasks
  const tasksAreLocal = planTasks.length === 0
  const timelineSteps = [
    { label: 'Create plan on Dashboard', done: planTasks.length > 0 },
    { label: 'Draft essay with AI coach', done: !!essayText },
    { label: 'Grade against rubric', done: !!gradeResult },
    { label: 'Revise weak criteria', done: !!revisedText },
    { label: 'Check Low extra work options', done: scholarship?.workloadLabel === 'Light' },
  ]

  const workspaceSteps = React.useMemo(
    () => [
      {
        label: 'Strategy',
        anchor: '#strategy-step',
        status: data?.personality ? 'done' : 'pending',
        hint: 'Winning plan & priorities',
      },
      {
        label: 'Draft',
        anchor: '#draft-step',
        status: essayText ? 'done' : 'pending',
        hint: 'Essay workspace',
      },
      {
        label: 'Grade',
        anchor: '#grade-step',
        status: gradeResult ? 'done' : 'pending',
        hint: 'Rubric grading & revision',
      },
      {
        label: 'Plan',
        anchor: '#plan-step',
        status: tasksToShow.length ? 'done' : 'pending',
        hint: 'Tasks & dashboard',
      },
    ],
    [data?.personality, essayText, gradeResult, tasksToShow.length],
  )
  const [activeWorkspaceStep, setActiveWorkspaceStep] = React.useState(0)

  const scrollToAnchor = React.useCallback((anchor: string) => {
    if (typeof document === 'undefined') return
    const idx = workspaceSteps.findIndex((s) => s.anchor === anchor)
    if (idx >= 0) setActiveWorkspaceStep(idx)
    const el = document.querySelector(anchor)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [workspaceSteps])

  const handleSendStoryToDraft = React.useCallback(() => {
    if (strategyStory.trim()) {
      setEssayText((prev) =>
        prev.trim() ? `${strategyStory.trim()}\n\n${prev}` : strategyStory.trim(),
      )
    }
    scrollToAnchor('#draft-step')
  }, [strategyStory, scrollToAnchor])


  if (loading && !scholarship) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background pb-12">
        <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
            <div className="space-y-6">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-full" />
                ))}
              </div>
              <Card>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-36" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !scholarship) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background pb-12">
        <div className="mx-auto max-w-4xl px-4 py-12 space-y-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Link to="/matches" className="text-xs text-primary underline">
            Back to matches
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-12">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Link
          to="/matches"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Matches
        </Link>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                {scholarship?.name ?? (loading ? 'Loading scholarship...' : 'Scholarship')}
              </h1>
              <p className="text-lg text-muted-foreground">{scholarship?.provider}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {(scholarship?.amountLabel ?? 'Amount TBA') + ' - ' + (scholarship?.frequencyLabel ?? 'One-time')}
                </Badge>
                <Badge variant="outline" className="gap-1 text-sm">
                  <CalendarDays className="h-4 w-4" />
                  <span>Deadline: {scholarship?.deadlineLabel ?? 'Not specified'}</span>
                  {scholarship?.daysLeftLabel && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {scholarship.daysLeftLabel}
                    </span>
                  )}
                </Badge>
                <Badge
                  className={`gap-1 text-sm ${
                    effectiveMatchScore != null && effectiveMatchScore >= 75
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'
                      : effectiveMatchScore != null && effectiveMatchScore >= 50
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
                        : 'bg-muted text-foreground'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {effectiveMatchScore != null
                    ? `Match ${effectiveMatchScore} - ${matchFitLabel}`
                    : 'Match score unavailable'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Using your saved profile + embeddings to rank this scholarship.
              </p>
              {isIneligible && (
                <p className="text-xs text-destructive">
                  Likely ineligible based on your profile (country/GPA/demographics). Explain Fit may still work for debugging, but consider skipping this one.
                </p>
              )}
            </div>
            {aiBusy && (
              <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-[11px] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {aiStatus}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Profile Match', anchor: '#profile-match' },
              { label: 'Personality', anchor: '#strategy-step' },
              { label: 'Draft', anchor: '#draft-step' },
              { label: 'Grade', anchor: '#grade-step' },
            ].map((chip) => (
              <Button
                key={chip.label}
                variant="outline"
                size="sm"
                className="rounded-full border-dashed"
                onClick={() => scrollToAnchor(chip.anchor)}
              >
                {chip.label}
              </Button>
            ))}
          </div>

          <TooltipProvider>
            <div className="flex flex-wrap gap-2 text-xs" aria-label="AI pipeline">
              {pipeline.map((step) => (
                <a key={step.label} href={step.anchor} className="focus:outline-none">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ring-1 ring-border transition ${
                          step.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            step.status === 'done' ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                        />
                        {step.label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-[11px]">
                      {step.hint}
                    </TooltipContent>
                  </Tooltip>
                </a>
              ))}
            </div>
          </TooltipProvider>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-6" id="profile-match">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">About this scholarship</CardTitle>
                    <CardDescription className="text-xs">
                      Snapshot of what this award is about.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExplainFit}
                    disabled={explainFitLoading || !profileAvailable}
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
              </CardHeader>
              <CardContent className="space-y-3">
                {!profileAvailable && (
                  <p className="text-xs text-muted-foreground">
                    Add a saved profile to unlock Explain Fit and planning actions.
                  </p>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {scholarship?.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <a
                      href={scholarship?.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View official page <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                  <button
                    onClick={() => setSourcesOpen(true)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Sources used
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">Eligibility</CardTitle>
                    <CardDescription className="text-xs">How we checked this for you.</CardDescription>
                  </div>
                  <button
                    className="text-[11px] text-muted-foreground hover:underline"
                    onClick={() => setEligibilityInfoOpen((v) => !v)}
                  >
                    How we checked
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {scholarship?.academicSummary && (
                    <Badge variant="outline" className="rounded-full px-2 py-0.5">
                      {scholarship.academicSummary}
                    </Badge>
                  )}
                  {scholarship?.geographicSummary && (
                    <Badge variant="outline" className="rounded-full px-2 py-0.5">
                      {scholarship.geographicSummary}
                    </Badge>
                  )}
                  {scholarship?.demographicSummary && (
                    <Badge variant="outline" className="rounded-full px-2 py-0.5">
                      {scholarship.demographicSummary}
                    </Badge>
                  )}
                </div>
                {eligibilityInfoOpen && (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                    Compared scholarship eligibility fields against your profile from `/api/profile`.
                    We only check what you filled; no guessing.
                  </div>
                )}
                <ul className="space-y-2">
                  {(scholarship?.eligibilityBullets ?? []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 dark:text-green-500" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                  {!loading && scholarship && scholarship.eligibilityBullets.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      Eligibility details are not fully specified in our dataset. Check the official page
                      to confirm the latest criteria.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">What you'll likely need</CardTitle>
                    <CardDescription className="text-xs">
                      Application components & workload.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => scrollToAnchor('#plan-step')}>
                    Plan this scholarship
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      scholarship?.workloadLabel === 'Light'
                        ? 'bg-green-500'
                        : scholarship?.workloadLabel === 'Medium'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium">{scholarship?.workloadLabel ?? 'Workload'}</span>
                  {scholarship?.workloadItems?.length ? (
                    <span className="text-muted-foreground">
                      {scholarship.workloadItems.join(' - ')}
                    </span>
                  ) : null}
                </div>
                {(scholarship?.components ?? []).length > 0 ? (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {scholarship?.components.map((c) => (
                      <li key={c.type} className="flex items-center gap-2">
                        <c.icon className="h-4 w-4 text-primary" />
                        <span>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Components for this scholarship are not fully structured yet. Check the official page
                    for the latest list of essays, references, and other materials.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6" id="workspace">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Application workspace</CardTitle>
                <CardDescription className="text-xs">
                  Follow the guided steps to go from strategy &rarr; draft &rarr; grade &rarr; plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                {workspaceSteps.map((step, idx) => (
                  <button
                    key={step.label}
                    onClick={() => setActiveWorkspaceStep(idx)}
                    className={`group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition focus:outline-none ${
                      activeWorkspaceStep === idx
                        ? 'border-primary bg-primary/10 text-primary'
                        : step.status === 'done'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/60'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        step.status === 'done' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-foreground">{step.label}</span>
                      <span className="text-[11px] text-muted-foreground">{step.hint}</span>
                    </div>
                  </button>
                ))}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {workspaceSteps.map((step, idx) => (
                      <button
                        key={step.label}
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          activeWorkspaceStep === idx ? 'bg-primary' : 'bg-muted-foreground/40'
                        }`}
                        aria-label={`Go to ${step.label}`}
                        onClick={() => setActiveWorkspaceStep(idx)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveWorkspaceStep((prev) => Math.max(0, prev - 1))}
                      disabled={activeWorkspaceStep === 0}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setActiveWorkspaceStep((prev) => Math.min(workspaceSteps.length - 1, prev + 1))
                      }
                      disabled={activeWorkspaceStep === workspaceSteps.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20 p-1">
              <div
                className="flex transition-transform duration-500"
                style={{ transform: `translateX(-${activeWorkspaceStep * 100}%)` }}
              >
                <div className="min-w-full px-1">
                  <Card id="strategy-step" className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-primary" />
                      1. Strategy & Personality
                    </CardTitle>
                    <CardDescription className="text-xs">
                      AI-explained plan grounded in winner patterns and provider language.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[11px]">AI-explained</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Winning strategy
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {formatLabel(scholarship?.winnerPatterns?.winner_profile) ||
                      "Lead with the story that best matches this provider's priorities. Show impact, clarity of purpose, and how your work aligns with their mission."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Keywords to use
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(scholarship?.personalityThemes.length
                          ? scholarship.personalityThemes
                          : scholarship?.winnerPatterns?.key_themes ?? []
                        ).map((theme) => (
                          <Badge key={theme} variant="secondary" className="rounded-md px-2 py-1 text-[11px]">
                            {formatLabel(theme)}
                          </Badge>
                        ))}
                        {!scholarship?.personalityThemes?.length &&
                          !(scholarship?.winnerPatterns?.key_themes?.length) && (
                            <span className="text-xs text-muted-foreground">Themes will appear once personality is loaded.</span>
                          )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Suggested tone
                      </p>
                      <p className="text-sm italic text-muted-foreground">
                        "{scholarship?.personalityTone || 'Professional & authentic'}"
                      </p>
                      {data?.personality?.notes?.length ? (
                        <p className="text-xs text-muted-foreground">
                          Emphasize: {data.personality.notes.join(', ')}
                        </p>
                      ) : null}
                    </div>
                    {scholarship?.winnerPatterns?.success_patterns?.length ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Tips for success
                        </p>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          {scholarship.winnerPatterns.success_patterns.slice(0, 3).map((tip, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                              <span>{formatLabel(tip)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {(scholarship?.winners?.length ?? 0) > 0 ? (
                      <div className="space-y-2 rounded-md border border-dashed border-border/70 bg-background p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Past winner highlights
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            Inspiration only
                          </Badge>
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          {(scholarship?.winners ?? []).slice(0, 2).map((w, idx) => (
                            <li key={idx} className="space-y-1 rounded-md border border-border/60 bg-muted/40 p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                  {w.winner_name || 'Winner story'}
                                </span>
                                {w.year ? <span className="text-[11px]">{w.year}</span> : null}
                              </div>
                              {w.story_excerpt ? <p className="text-xs leading-relaxed">{formatLabel(w.story_excerpt)}</p> : null}
                              {w.themes?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {w.themes.slice(0, 3).map((t) => (
                                    <Badge key={t} variant="secondary" className="rounded px-2 py-0 text-[10px]">
                                      {formatLabel(t)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {personalityWeights.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Hidden priorities
                        </p>
                        <div className="space-y-2">
                          {personalityWeights.map((w) => (
                            <div key={w.key} className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{w.key}</span>
                                <span className="text-[11px]">{w.value.toFixed(2)}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${w.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data?.personality?.tone && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">Tone guide</p>
                        <p>{data.personality.tone}</p>
                      </div>
                    )}
                    {data?.personality?.notes?.length ? (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">Writing focus</p>
                        <p>{data.personality.notes.join(', ')}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Ready? Send a story to Draft
                  </p>
                  <Textarea
                    value={strategyStory}
                    onChange={(e) => setStrategyStory(e.target.value)}
                    rows={3}
                    className="text-sm"
                    placeholder="Tell us one project, moment, or challenge that shows why you fit."
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Button size="sm" onClick={handleSendStoryToDraft} disabled={!strategyStory.trim()}>
                      Send to Draft
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => scrollToAnchor('#draft-step')}>
                      Skip to Draft
                    </Button>
                  </div>
                </div>
              </CardContent>
                  </Card>
                </div>
                <div className="min-w-full px-1">
                  <Card id="draft-step" className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      2. Draft essay
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Draft with AI, keeping the rubric and priorities in view.
                    </CardDescription>
                  </div>
                  {personalityWeights.length > 1 && (
                    <Badge variant="outline" className="text-[11px]">
                      Focus: {personalityWeights.slice(0, 2).map((w) => w.key).join(' - ')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,1fr)]">
                  <div className="space-y-3">
                    <Textarea
                      value={essayText}
                      onChange={(e) => setEssayText(e.target.value)}
                      rows={8}
                      className="text-sm"
                      placeholder="Paste or generate your essay here..."
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Button size="sm" onClick={handleDraft} disabled={draftLoading}>
                        {draftLoading ? 'Drafting...' : 'Draft with AI'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => scrollToAnchor('#grade-step')}>
                        Grade this next
                      </Button>
                      {draftError && <span className="text-destructive">{draftError}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      AI-safe: we only send scholarship context and your essay text, not your personal contact details.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Key criteria
                    </p>
                    {rubric && rubric.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {rubric.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                            <div>
                              <p className="font-semibold text-foreground">{item.name}</p>
                              {item.description && <p>{item.description}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Rubric not loaded yet. We will still draft based on strategy and themes.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
                  </Card>
                </div>
                <div className="min-w-full px-1">
                  <Card id="grade-step" className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListTodo className="h-4 w-4 text-primary" />
                  3. Grade & compare
                </CardTitle>
                <CardDescription className="text-xs">
                  Measure your draft against the rubric, compare to a generic essay, and get targeted revisions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={handleGrade} disabled={gradeLoading}>
                      {gradeLoading ? 'Grading...' : 'Grade with rubric'}
                    </Button>
                    {gradeError && <span className="text-xs text-destructive">{gradeError}</span>}
                  </div>
                  {gradeResult && (
                    <div className="space-y-2 rounded-md bg-muted/40 p-3 text-xs">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                        Readiness: {gradeResult.readiness}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{gradeResult.overall_comment}</p>
                      <ul className="space-y-1.5">
                        {gradeResult.criteria.map((c) => (
                          <li key={c.id} className="flex items-start gap-2">
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {c.score}/{c.max}
                            </span>
                            <div>
                              <p className="text-[11px] font-semibold text-foreground">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground">{c.feedback}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {scholarship?.winnerPatterns && (
                    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          How you compare to winners
                        </p>
                        <Badge variant="outline" className="text-[10px]">Patterns only</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Winners usually: {formatLabel(scholarship.winnerPatterns.winner_profile) || 'Emphasize impact, leadership, and reflection.'}
                      </p>
                      {scholarship.winnerPatterns.key_themes?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {scholarship.winnerPatterns.key_themes.slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary" className="rounded px-2 py-0 text-[10px]">
                              {formatLabel(t)}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {scholarship.winnerPatterns.success_patterns?.length ? (
                        <ul className="space-y-1 text-[11px] text-muted-foreground">
                          {scholarship.winnerPatterns.success_patterns.slice(0, 2).map((tip, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                              <span>{formatLabel(tip)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {gradeResult?.criteria?.length ? (() => {
                        const weakest = [...gradeResult.criteria].sort((a, b) => (a.score / a.max) - (b.score / b.max))[0]
                        return weakest ? (
                          <p className="text-[11px] text-muted-foreground">
                            Your lowest rubric area: <span className="font-semibold text-foreground">{weakest.name}</span>. Shape this section like winners do above.
                          </p>
                        ) : null
                      })() : null}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Generic vs tailored</p>
                    <span className="text-[11px] text-muted-foreground">See where the tailored draft wins</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Textarea
                        value={genericEssay}
                        onChange={(e) => setGenericEssay(e.target.value)}
                        rows={6}
                        className="text-sm"
                        placeholder="Paste a baseline / generic essay here..."
                      />
                      <p className="text-[11px] text-muted-foreground">Generic essay (control)</p>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        value={essayText}
                        onChange={(e) => setEssayText(e.target.value)}
                        rows={6}
                        className="text-sm"
                        placeholder="Use your tailored draft here..."
                      />
                      <p className="text-[11px] text-muted-foreground">Tailored essay (from workspace)</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Button size="sm" onClick={handleCompareGrade} disabled={compareLoading}>
                      {compareLoading ? 'Scoring...' : 'Grade both essays'}
                    </Button>
                    {compareError && <span className="text-destructive">{compareError}</span>}
                  </div>

                  {(compareResult.generic || compareResult.tailored) && (
                    <div className="space-y-3 rounded-md bg-muted/30 p-3 text-xs">
                      <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase text-muted-foreground">
                        <span>Generic: {compareResult.generic?.readiness ?? '-'}</span>
                        <span>Tailored: {compareResult.tailored?.readiness ?? '-'}</span>
                        {compareResult.generic?.criteria && compareResult.tailored?.criteria ? (
                          <span className="text-primary">
                            Tailored score delta:{' '}
                            {(
                              compareResult.tailored.criteria.reduce((a, c) => a + c.score, 0) -
                              compareResult.generic.criteria.reduce((a, c) => a + c.score, 0)
                            ).toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {(['generic', 'tailored'] as const).map((kind) => {
                          const data = compareResult[kind]
                          if (!data) return null
                          return (
                            <div key={kind} className="space-y-2 rounded-md border border-border bg-background p-3">
                              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                {kind === 'generic' ? 'Generic' : 'Tailored'} scores
                              </p>
                              <ul className="space-y-1.5">
                                {data.criteria.map((c) => (
                                  <li key={c.id} className="flex items-start gap-2">
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                      {c.score}/{c.max}
                                    </span>
                                    <div>
                                      <p className="text-[11px] font-semibold text-foreground">{c.name}</p>
                                      <p className="text-[11px] text-muted-foreground">{c.feedback}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Targeted revision (RubricCoach)</p>
                    <span className="text-[11px] text-muted-foreground">Improve one criterion at a time</span>
                  </div>
                  {!rubric && (
                    <p className="text-[11px] text-muted-foreground">Rubric not loaded yet. Try again in a moment.</p>
                  )}
                  {rubric && rubric.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No rubric found for this scholarship.</p>
                  )}
                  {rubric && rubric.length > 0 && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Criterion</label>
                        <select
                          value={reviseCriterionId}
                          onChange={(e) => setReviseCriterionId(e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          {rubric.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Your current essay snippet
                        </label>
                        <Textarea
                          value={reviseText}
                          onChange={(e) => setReviseText(e.target.value)}
                          rows={5}
                          className="text-xs"
                          placeholder="Paste the section to revise..."
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <Button size="sm" onClick={handleRevise} disabled={reviseLoading}>
                          {reviseLoading ? 'Revising...' : 'Improve this section'}
                        </Button>
                        {reviseError && <span className="text-destructive">{reviseError}</span>}
                      </div>
                      {reviseRationale && (
                        <div className="rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
                          <p className="mb-1 font-semibold text-foreground">Why this change</p>
                          <p>{reviseRationale}</p>
                        </div>
                      )}
                      {revisedText && (
                        <div className="space-y-2 rounded-md border border-border bg-background p-3 text-[11px]">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">AI suggestion</p>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" onClick={acceptRevision}>
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRevisedText(null)
                                  setReviseRationale(null)
                                }}
                              >
                                Discard
                              </Button>
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap text-muted-foreground">{revisedText}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
                  </Card>
                </div>
                <div className="min-w-full px-1">
                  <Card id="plan-step" className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ListTodo className="h-4 w-4 text-primary" />
                  4. Plan & tasks
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate a tailored plan and track progress on your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Application pipeline
                  </p>
                  <div className="space-y-1.5">
                    {timelineSteps.map((step) => (
                      <div key={step.label} className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            step.done ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                          }`}
                        />
                        <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Button
                    size="sm"
                    onClick={handlePlanApplication}
                    disabled={planLoading || !profileAvailable}
                  >
                    {planLoading ? (
                      <>
                        <Sparkles className="mr-2 h-3 w-3 animate-pulse" />
                        Creating plan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-3 w-3" />
                        Create / update plan
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <Link to="/dashboard">
                      Dashboard
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" asChild>
                    <Link to="/essay/$id" params={{ id }}>
                      Draft page
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                {!profileAvailable && (
                  <p className="text-[11px] text-muted-foreground">
                    Save a profile to enable planning and dashboard syncing.
                  </p>
                )}
                {planError && <p className="text-[11px] text-destructive">{planError}</p>}

                {tasksToShow.length > 0 ? (
                  <div className="space-y-2 rounded-md bg-muted/40 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-muted-foreground">Suggested tasks</p>
                      {tasksAreLocal && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={resetLocalTasks}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                      {tasksToShow.map((task) => (
                        <li key={task.id} className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {tasksAreLocal ? (
                              <input
                                type="checkbox"
                                checked={!!task.completed}
                                onChange={() => toggleLocalTask(task.id)}
                                className="mt-0.5 h-3.5 w-3.5 accent-primary"
                              />
                            ) : (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
                            )}
                            <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                              {task.label}
                            </span>
                          </div>
                          {task.due_date && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">Due {task.due_date}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No tasks yet. Use the planner button to generate a plan or fill components for this scholarship.
                  </p>
                )}
              </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

      <Dialog open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sources used</DialogTitle>
            <DialogDescription className="text-xs">
              Data that informs this scholarship view and AI pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span>Official website</span>
              <Badge variant="outline" className="text-[11px] font-medium">
                Used for details
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <span>Curated description</span>
              <Badge variant="outline" className="text-[11px] font-medium">
                Used for personality/themes
              </Badge>
            </div>
            {scholarship?.winnerPatterns && (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                <span>Winner stories</span>
                <Badge variant="outline" className="text-[11px] font-medium">
                  Patterns only
                </Badge>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={explainFitOpen} onOpenChange={setExplainFitOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Why This Scholarship Fits You</DialogTitle>
            <DialogDescription>AI-powered analysis of your profile match with this scholarship</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Strengths, gaps, and eligibility pulled from the explanation graph.</span>
            {explainFitRaw && (
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => setShowExplainFitJson((v) => !v)}
              >
                For judges: {showExplainFitJson ? 'Hide JSON' : 'See JSON'}
              </button>
            )}
          </div>
          <div
            className={
              showExplainFitJson && explainFitRaw ? 'grid gap-4 md:grid-cols-[3fr_2fr]' : 'space-y-4'
            }
          >
            <div className="space-y-4">
              {explainFitResult ? (
                <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {explainFitResult}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No explanation available.</p>
              )}
            </div>
            {showExplainFitJson && explainFitRaw && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground">Structured output</p>
                <pre className="max-h-[360px] overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                  {JSON.stringify(explainFitRaw, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
)
}
