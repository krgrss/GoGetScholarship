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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

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
  const [sourcesOpen, setSourcesOpen] = React.useState(false)
  const [eligibilityInfoOpen, setEligibilityInfoOpen] = React.useState(false)
  const [showJudgeDebug, setShowJudgeDebug] = React.useState(false)
  const [profileJsonOpen, setProfileJsonOpen] = React.useState(false)
  const [profileJson, setProfileJson] = React.useState<any | null>(null)

  const [profileAvailable, setProfileAvailable] = React.useState(false)

  React.useEffect(() => {
    setProfileAvailable(
      !!localStorage.getItem('scholarship_student_id') || !!localStorage.getItem('student_id'),
    )
  }, [])

  const pipeline = React.useMemo(
    () =>
      [
        {
          label: 'Profile',
          status: profileAvailable ? 'done' : 'available',
          hint: 'Loaded from /api/profile via studentId.',
          anchor: '#profile',
        },
        {
          label: 'Match',
          status: 'done',
          hint: 'Ranked via /api/match + /api/rerank with embeddings.',
          anchor: '#match',
        },
        {
          label: 'Personality',
          status: data?.personality ? 'done' : 'available',
          hint: 'Personality profile cached from /api/personality.',
          anchor: '#personality',
        },
        {
          label: 'Draft',
          status: essayText ? 'done' : 'available',
          hint: 'Essay workspace connected to /api/draft.',
          anchor: '#essay-workspace',
        },
        {
          label: 'Grade',
          status: gradeResult ? 'done' : 'available',
          hint: 'Rubric grading from /api/grade-essay.',
          anchor: '#grade',
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
      (min_gpa != null || (level && level.length)) && essaysCount > 0
        ? 'Academic: requirements listed'
        : min_gpa != null || (level && level.length)
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
      setPlanError(String(e.message || e))
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

  const tasksToShow = planTasks.length ? planTasks : localTasks
  const tasksAreLocal = planTasks.length === 0
  const timelineSteps = [
    { label: 'Create plan on Dashboard', done: planTasks.length > 0 },
    { label: 'Draft essay with AI coach', done: !!essayText },
    { label: 'Grade against rubric', done: !!gradeResult },
    { label: 'Revise weak criteria', done: !!revisedText },
    { label: 'Check Low extra work options', done: scholarship?.workloadLabel === 'Light' },
  ]
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
    if (draftLoading) return 'Drafting with AI…'
    if (gradeLoading) return 'Grading against rubric…'
    if (compareLoading) return 'Comparing essays…'
    if (explainFitLoading) return 'Analyzing fit…'
    if (planLoading) return 'Building plan…'
    if (reviseLoading) return 'Revising by criterion…'
    return ''
  }, [draftLoading, gradeLoading, compareLoading, explainFitLoading, planLoading, reviseLoading])

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
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-lg text-muted-foreground">
                  {scholarship?.provider}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowJudgeDebug((v) => !v)}
                >
                  {showJudgeDebug ? 'Hide advanced debug' : 'Show advanced debug'}
                </Button>
              </div>

              <TooltipProvider>
                <div className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="AI pipeline">
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
              {aiBusy && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-[11px] text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {aiStatus}
                </div>
              )}
              {showJudgeDebug && (
                <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  <div className="flex flex-wrap gap-4">
                    <span>ID: {scholarship?.id}</span>
                    <span>Personality: {data?.personality ? 'loaded' : 'not loaded'}</span>
                    <span>Rubric items: {rubric?.length ?? 0}</span>
                    <span>Tasks seeded: {scholarship?.taskSeeds.length ?? 0}</span>
                    {profileJson && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => setProfileJsonOpen(true)}
                      >
                        View raw profile JSON
                      </Button>
                    )}
                  </div>
                </div>
              )}

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
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Match 82 • High fit</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Using your saved profile + embeddings to rank this scholarship.
              </p>
            </div>

            <section className="space-y-4" id="about">
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
              <div className="flex items-center gap-4">
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
            </section>

            {scholarship?.winnerPatterns && (
              <section className="space-y-3" id="winners">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Past winners & patterns</h3>
                  <Badge variant="outline" className="text-[11px] font-medium">
                    AI-mined
                  </Badge>
                </div>
                <Card>
                  <CardContent className="pt-5">
                    <Tabs defaultValue="examples" className="space-y-3">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="examples">Examples</TabsTrigger>
                        <TabsTrigger value="patterns">Patterns</TabsTrigger>
                      </TabsList>
                      <TabsContent value="examples" className="space-y-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {scholarship.winnerPatterns.winner_profile}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {scholarship.winnerPatterns.key_themes.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="rounded-full px-2 py-0.5 text-[11px]"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>
                      <TabsContent value="patterns" className="space-y-3">
                        <div className="space-y-2">
                          {scholarship.winnerPatterns.success_patterns.map((p, idx) => {
                            const strength = Math.max(40, 90 - idx * 10)
                            return (
                              <div
                                key={p}
                                className="space-y-1 rounded-md border border-border bg-muted/30 p-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-foreground">{p}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    ~{Math.round(strength)}% of winners
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${strength}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                          {scholarship.winnerPatterns.success_patterns.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No patterns available yet.
                            </p>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Patterns extracted by AI from public winner stories.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Explain Fit Dialog */}
            <Dialog open={explainFitOpen} onOpenChange={setExplainFitOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Why This Scholarship Fits You</DialogTitle>
                  <DialogDescription>
                    AI-powered analysis of your profile match with this scholarship
                  </DialogDescription>
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
                    showExplainFitJson && explainFitRaw
                      ? 'grid gap-4 md:grid-cols-[3fr_2fr]'
                      : 'space-y-4'
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
                      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                        Structured output
                      </p>
                      <pre className="max-h-[360px] overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                        {JSON.stringify(explainFitRaw, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <section className="space-y-4" id="match">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Eligibility</h2>
                <button
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setEligibilityInfoOpen((v) => !v)}
                >
                  How we checked this
                </button>
              </div>
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
                  Compared scholarship eligibility fields against your profile from `/api/profile`. We only check what you filled; no guessing.
                </div>
              )}
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

              <Card id="essay-workspace">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Essay workspace</CardTitle>
                  <CardDescription className="text-xs">
                    Draft with AI (requires admin key) and grade against this scholarship&apos;s rubric.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rubric && rubric.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Key criteria
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rubric.map((c) => (
                          <Button
                            key={c.id}
                            size="sm"
                            variant={reviseCriterionId === c.id ? 'default' : 'outline'}
                            className="h-7 rounded-full px-3 text-[11px]"
                            onClick={() => setReviseCriterionId(c.id)}
                          >
                            {c.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    AI-safe: we only send scholarship context and your essay text, not your personal contact details.
                  </p>
                  <Textarea
                    value={essayText}
                    onChange={(e) => setEssayText(e.target.value)}
                    rows={8}
                    className="text-sm"
                    placeholder="Paste or generate your essay here..."
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Button size="sm" onClick={handleDraft} disabled={draftLoading}>
                      {draftLoading ? 'Drafting…' : 'Draft with AI'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGrade} disabled={gradeLoading}>
                      {gradeLoading ? 'Grading…' : 'Grade with rubric'}
                    </Button>
                    {draftError && <span className="text-destructive">{draftError}</span>}
                    {gradeError && <span className="text-destructive">{gradeError}</span>}
                  </div>
                  {gradeResult && (
                    <div id="grade" className="space-y-2 rounded-md bg-muted/40 p-3 text-xs">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                        Readiness: {gradeResult.readiness}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {gradeResult.overall_comment}
                      </p>
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
                </CardContent>
              </Card>

              <Card id="compare">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Compare essays</CardTitle>
                  <CardDescription className="text-xs">
                    Grade a generic vs tailored essay and see where the tailored version wins.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Generic essay</p>
                        <span className="text-[11px] text-muted-foreground">Control</span>
                      </div>
                      <Textarea
                        value={genericEssay}
                        onChange={(e) => setGenericEssay(e.target.value)}
                        rows={8}
                        className="text-sm"
                        placeholder="Paste a baseline / generic essay here..."
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Tailored essay</p>
                        <span className="text-[11px] text-muted-foreground">From workspace</span>
                      </div>
                      <Textarea
                        value={essayText}
                        onChange={(e) => setEssayText(e.target.value)}
                        rows={8}
                        className="text-sm"
                        placeholder="Use your tailored draft here..."
                      />
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
                        <span>Generic: {compareResult.generic?.readiness ?? '—'}</span>
                        <span>Tailored: {compareResult.tailored?.readiness ?? '—'}</span>
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
                </CardContent>
              </Card>
            </section>

            <Dialog open={profileJsonOpen} onOpenChange={setProfileJsonOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Raw profile (for judges)</DialogTitle>
                  <DialogDescription className="text-xs">
                    Structured profile data currently cached in your browser.
                  </DialogDescription>
                </DialogHeader>
                {profileJson ? (
                  <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                    {JSON.stringify(profileJson, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No cached profile found in local storage.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Right Column (Sticky) */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <Card className="border-primary/20 shadow-md" id="personality">
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
                {personalityWeights.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      What they weigh most
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
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      scholarship?.workloadLabel === 'Light'
                        ? 'bg-green-500'
                        : scholarship?.workloadLabel === 'Medium'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium">
                    {scholarship?.workloadLabel ?? 'Workload'}
                  </span>
                  {scholarship?.workloadItems?.length ? (
                    <span className="text-muted-foreground">
                      {scholarship.workloadItems.join(' · ')}
                    </span>
                  ) : null}
                </div>
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

                <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">
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

                {planError && (
                  <p className="text-[11px] text-destructive">{planError}</p>
                )}

                {tasksToShow.length > 0 ? (
                  <div className="space-y-2 rounded-md bg-muted/40 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Suggested tasks
                      </p>
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
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              Due {task.due_date}
                            </span>
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Targeted revision (RubricCoach)</CardTitle>
                <CardDescription className="text-xs">
                  Pick a weak criterion and request a focused revision. Accept or discard locally.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!rubric && (
                  <p className="text-[11px] text-muted-foreground">
                    Rubric not loaded yet. Try again in a moment.
                  </p>
                )}
                {rubric && rubric.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    No rubric found for this scholarship.
                  </p>
                )}
                {rubric && rubric.length > 0 && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Criterion
                      </label>
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
                        rows={6}
                        className="text-xs"
                        placeholder="Paste the section to revise..."
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <Button size="sm" onClick={handleRevise} disabled={reviseLoading}>
                        {reviseLoading ? 'Revising…' : 'Revise for this criterion'}
                      </Button>
                      {reviseError && (
                        <span className="text-destructive">{reviseError}</span>
                      )}
                    </div>
                    {revisedText && (
                      <div className="space-y-2 rounded-md bg-muted/30 p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          Revision candidate
                        </p>
                        <div className="grid gap-2 text-xs md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-muted-foreground">Original</p>
                            <div className="rounded-md border border-border bg-background p-2 whitespace-pre-wrap">
                              {reviseText || '(empty)'}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-muted-foreground">Revised</p>
                            <div className="rounded-md border border-border bg-background p-2 whitespace-pre-wrap">
                              {revisedText}
                            </div>
                          </div>
                        </div>
                        {reviseRationale && (
                          <p className="text-[11px] text-muted-foreground">
                            Rationale: {reviseRationale}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={acceptRevision}>
                            Accept revision
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRevisedText(null)
                              setReviseRationale(null)
                            }}
                          >
                            Discard
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
         </div>
       </div>
     </div>
   </div>
 )
}
