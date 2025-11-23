import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Upload } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { LiveImpactStrip } from '@/components/LiveImpactStrip'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

type StepKey = 'basics' | 'boost'

type ActivityForm = {
  id: string
  role: string
  organization: string
  impact: string
  startYear?: string
  endYear?: string
  ongoing?: boolean
}

const STEPS: { key: StepKey; label: string; description: string }[] = [
  {
    key: 'basics',
    label: 'Eligibility basics',
    description: 'Country, level, program, and GPA to filter ineligible awards.',
  },
  {
    key: 'boost',
    label: 'Boost your matches',
    description: 'Identity tags, activities, and resume to unlock niche awards.',
  },
]

const IDENTITY_TAGS = [
  'first_generation',
  'low_income',
  'international_student',
  'disability',
  'lgbtq',
  'woman_in_stem',
  'indigenous',
  'black',
  'latino',
  'veteran',
]

function OnboardingPage() {
  const navigate = useNavigate()

  // Basics
  const [country, setCountry] = React.useState('')
  const [level, setLevel] = React.useState('')
  const [major, setMajor] = React.useState('')
  const [gpa, setGpa] = React.useState('')
  const [gpaScale, setGpaScale] = React.useState('4.0')
  const [gpaUnknownReason, setGpaUnknownReason] = React.useState('')

  // Boost
  const [identityTags, setIdentityTags] = React.useState<string[]>([])
  const [gender, setGender] = React.useState('')
  const [yearOfBirth, setYearOfBirth] = React.useState('')
  const [ethnicity, setEthnicity] = React.useState('')
  const [activities, setActivities] = React.useState<ActivityForm[]>([
    { id: 'a-1', role: '', organization: '', impact: '' },
  ])
  const [resumeUrl, setResumeUrl] = React.useState('')
  const [bioBullets, setBioBullets] = React.useState('')

  const [stepIndex, setStepIndex] = React.useState(0)
  const [saving, setSaving] = React.useState(false)

  const currentStep = STEPS[stepIndex]

  // Prefill if a profile exists
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('scholarship_profile')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setCountry(parsed.country || '')
        setLevel(parsed.level || '')
        setMajor(parsed.program || parsed.major || '')
        setGpa(parsed.gpa || '')
        setGpaScale(parsed.gpaScale || '4.0')
        setGpaUnknownReason(parsed.gpaUnknownReason || '')
        setIdentityTags(parsed.identityTags || [])
        setGender(parsed.gender || '')
        setYearOfBirth(parsed.yearOfBirth || '')
        setEthnicity(parsed.ethnicity || '')
        setResumeUrl(parsed.resumeUrl || '')
        setBioBullets(parsed.bioBullets || '')
        if (Array.isArray(parsed.activities) && parsed.activities.length) {
          setActivities(
            parsed.activities.map((a: any, idx: number) => ({
              id: a.id || `act-${idx}`,
              role: a.role || '',
              organization: a.organization || '',
              impact: a.impact || a.description || '',
              startYear: a.startYear ? String(a.startYear) : a.startYear,
              endYear: a.endYear ? String(a.endYear) : a.endYear,
              ongoing: a.ongoing,
            })),
          )
        }
      } catch (e) {
        console.error('Failed to parse stored profile', e)
      }
    }
  }, [])

  const matchesUnlocked = React.useMemo(() => {
    if (stepIndex === 0) return 12
    return 22
  }, [stepIndex])

  const completionState = stepIndex === STEPS.length - 1 ? 'boost' : 'basics'

  const previewSummary = React.useMemo(() => {
    const lines = []
    if (country || level || major) {
      lines.push(
        `Studying ${major || 'my program'} at ${level || 'my level'} in ${country || 'my country'}.`,
      )
    }
    if (gpa) lines.push(`GPA: ${gpa}/${gpaScale || '4.0'}.`)
    if (!gpa && gpaUnknownReason) lines.push(`GPA not provided: ${gpaUnknownReason}.`)
    if (identityTags.length) {
      lines.push(`Identity highlights: ${identityTags.map(formatTag).join(', ')}.`)
    }
    const activeActivities = activities.filter(
      (a) => a.role || a.organization || a.impact,
    )
    if (activeActivities.length) {
      lines.push(
        `Activities: ${activeActivities
          .map((a) => `${a.role || 'Member'} at ${a.organization || 'Org'} (${a.impact || 'impact'})`)
          .join('; ')}.`,
      )
    }
    if (bioBullets) {
      lines.push(bioBullets.slice(0, 200))
    }
    return lines.join(' ')
  }, [country, level, major, gpa, gpaScale, gpaUnknownReason, identityTags, activities, bioBullets])

  function toggleTag(tag: string) {
    setIdentityTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function updateActivity(id: string, patch: Partial<ActivityForm>) {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function addActivity() {
    setActivities((prev) => [...prev, { id: `act-${Date.now()}`, role: '', organization: '', impact: '' }])
  }

  function removeActivity(id: string) {
    setActivities((prev) => (prev.length > 1 ? prev.filter((a) => a.id !== id) : prev))
  }

  function nextStep() {
    if (stepIndex === 0) {
      if (!country || !level || !major) {
        toast.error('Country, level, and program are required.')
        return
      }
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  async function handleSubmit() {
    if (!country || !level || !major) {
      toast.error('Country, level, and program are required.')
      setStepIndex(0)
      return
    }
    setSaving(true)
    try {
      const gpaNumber = gpa ? Number(gpa) : undefined
      const scaleNumber = gpaScale ? Number(gpaScale) : undefined
      let normalizedGpa: number | undefined = undefined
      if (typeof gpaNumber === 'number' && !Number.isNaN(gpaNumber)) {
        if (!scaleNumber || scaleNumber === 4 || scaleNumber === 4.0) {
          normalizedGpa = gpaNumber
        } else if (scaleNumber === 100) {
          normalizedGpa = Number((gpaNumber / 25).toFixed(2))
        } else if (scaleNumber === 4.3) {
          normalizedGpa = Number((gpaNumber * (4 / 4.3)).toFixed(2))
        }
      }

      const profileSummary =
        previewSummary ||
        `Student in ${country} at ${level}, studying ${major}. ${gpa ? `GPA ${gpa}/${gpaScale}.` : ''}`

      const payload = {
        name: undefined,
        gpa: normalizedGpa,
        major: major || undefined,
        country: country || undefined,
        gender: gender || undefined,
        date_of_birth: yearOfBirth ? `${yearOfBirth}-01-01` : undefined,
        ethnicity: ethnicity || undefined,
        level_of_study: level || undefined,
        summary: profileSummary,
        metadata: {
          level,
          gpaScale,
          gpaUnknownReason,
          identityTags,
          yearOfBirth,
          resumeUrl,
          bioBullets,
          activities,
          source: 'onboarding',
          completion: completionState,
        },
      }

      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const profileData = await profileRes.json()
      if (!profileRes.ok || !profileData.ok) {
        throw new Error(profileData?.error || `Profile save failed (${profileRes.status})`)
      }
      if (profileData.student_id) {
        localStorage.setItem('scholarship_student_id', profileData.student_id)
        localStorage.setItem('student_id', profileData.student_id)
      }

      const storedProfile = {
        country,
        level,
        program: major,
        major,
        gpa,
        gpaScale,
        gpaUnknownReason,
        identityTags,
        gender,
        yearOfBirth,
        ethnicity,
        resumeUrl,
        bioBullets,
        activities,
        summary: profileSummary,
        completedAt: new Date().toISOString(),
        completion: completionState,
      }
      localStorage.setItem('scholarship_profile', JSON.stringify(storedProfile))
      localStorage.setItem('has_completed_onboarding', 'true')
      sessionStorage.setItem('matches_ready_banner', 'true')

      toast.success('Profile saved! Your matches are ready.')
      navigate({ to: '/matches', search: { view: 'swipe' } })
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Onboarding</p>
            <h1 className="text-3xl font-bold tracking-tight">
              Teach the AI who you are. Unlock better matches.
            </h1>
            <p className="text-sm text-muted-foreground">
              Eligibility first. Then add optional details to boost niche awards and essay coaching.
            </p>
          </div>
          <LiveImpactStrip matchesUnlocked={matchesUnlocked} />
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.8fr,1fr]">
          <Card className="shadow-sm">
            <CardHeader className="space-y-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {stepIndex + 1}
                  </span>
                  Step {stepIndex + 1} of {STEPS.length}
                </div>
                <Badge variant="outline" className="text-[11px]">
                  Personalized by AI
                </Badge>
              </div>
              <div>
                <CardTitle className="text-2xl">{currentStep.label}</CardTitle>
                <CardDescription className="text-base">{currentStep.description}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {STEPS.map((step, idx) => (
                  <Badge
                    key={step.key}
                    variant={idx === stepIndex ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setStepIndex(idx)}
                  >
                    {idx + 1}. {step.label}
                  </Badge>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-6 py-6">
              {currentStep.key === 'basics' && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Country of study" required>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Level of study" required>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high_school">High school</SelectItem>
                          <SelectItem value="undergrad">Undergrad</SelectItem>
                          <SelectItem value="grad">Graduate / Masters</SelectItem>
                          <SelectItem value="phd">PhD</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <FormField label="Program / major" required>
                    <Input
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="Computer Science, Nursing, Business..."
                    />
                  </FormField>

                  <div className="grid gap-4 md:grid-cols-[1fr,0.8fr,1fr]">
                    <FormField label="GPA (optional)">
                      <Input
                        value={gpa}
                        onChange={(e) => setGpa(e.target.value)}
                        placeholder="3.8"
                        inputMode="decimal"
                      />
                    </FormField>
                    <FormField label="Scale">
                      <Select value={gpaScale} onValueChange={setGpaScale}>
                        <SelectTrigger>
                          <SelectValue placeholder="Scale" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4.0">4.0</SelectItem>
                          <SelectItem value="4.3">4.3</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="5.0">5.0</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="No GPA? (optional)">
                      <Select value={gpaUnknownReason} onValueChange={setGpaUnknownReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school_no_gpa">My school does not use GPA</SelectItem>
                          <SelectItem value="not_sure">I am not sure yet</SelectItem>
                          <SelectItem value="gap_year">On a gap year</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <Card className="border-dashed bg-muted/40">
                    <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                      <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">Why we ask</p>
                        <p>
                          Country, level, and GPA let us remove ineligible awards and rank the best fits first.
                          You can always edit these later.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {currentStep.key === 'boost' && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Gender (optional)">
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Non-binary">Non-binary</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Year of birth (optional)">
                      <Input
                        value={yearOfBirth}
                        onChange={(e) => setYearOfBirth(e.target.value)}
                        placeholder="2005"
                        inputMode="numeric"
                      />
                    </FormField>
                  </div>

                  <FormField label="Ethnicity (optional)">
                    <Select value={ethnicity} onValueChange={setEthnicity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ethnicity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asian">Asian</SelectItem>
                        <SelectItem value="Black or African American">Black or African American</SelectItem>
                        <SelectItem value="Hispanic or Latino">Hispanic or Latino</SelectItem>
                        <SelectItem value="Indigenous">Indigenous</SelectItem>
                        <SelectItem value="Middle Eastern">Middle Eastern</SelectItem>
                        <SelectItem value="Pacific Islander">Pacific Islander</SelectItem>
                        <SelectItem value="White">White</SelectItem>
                        <SelectItem value="Two or more races">Two or more races</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Identity tags (optional)</label>
                    <p className="text-xs text-muted-foreground">
                      These only unlock extra scholarships; they never reduce your matches.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {IDENTITY_TAGS.map((tag) => {
                        const active = identityTags.includes(tag)
                        return (
                          <Badge
                            key={tag}
                            variant={active ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {formatTag(tag)}
                            {active && <Check className="ml-1 h-3 w-3" />}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-foreground">Activities (optional)</label>
                      <Button variant="outline" size="sm" onClick={addActivity}>
                        + Add activity
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <Card key={activity.id} className="border-dashed">
                          <CardContent className="space-y-3 p-4">
                            <div className="grid gap-3 md:grid-cols-2">
                              <Input
                                placeholder="Role (e.g., President)"
                                value={activity.role}
                                onChange={(e) => updateActivity(activity.id, { role: e.target.value })}
                              />
                              <Input
                                placeholder="Organization (e.g., Debate Club)"
                                value={activity.organization}
                                onChange={(e) =>
                                  updateActivity(activity.id, { organization: e.target.value })
                                }
                              />
                            </div>
                            <Textarea
                              placeholder="Impact in one sentence (e.g., grew membership by 30%, led regional competitions)."
                              value={activity.impact}
                              onChange={(e) => updateActivity(activity.id, { impact: e.target.value })}
                              className="min-h-[80px]"
                            />
                            <div className="grid gap-3 md:grid-cols-3">
                              <Input
                                placeholder="Start year"
                                value={activity.startYear || ''}
                                onChange={(e) => updateActivity(activity.id, { startYear: e.target.value })}
                                inputMode="numeric"
                              />
                              <Input
                                placeholder="End year (or leave blank if current)"
                                value={activity.endYear || ''}
                                onChange={(e) => updateActivity(activity.id, { endYear: e.target.value })}
                                inputMode="numeric"
                              />
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={Boolean(activity.ongoing)}
                                  onChange={(e) => updateActivity(activity.id, { ongoing: e.target.checked })}
                                />
                                Still active
                              </div>
                            </div>
                            {activities.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => removeActivity(activity.id)}
                              >
                                Remove
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Resume or portfolio link (optional)">
                      <div className="flex items-center gap-2">
                        <Input
                          value={resumeUrl}
                          onChange={(e) => setResumeUrl(e.target.value)}
                          placeholder="https://..."
                        />
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormField>
                    <FormField label="Bio / quick bullets (optional)">
                      <Textarea
                        value={bioBullets}
                        onChange={(e) => setBioBullets(e.target.value)}
                        className="min-h-[90px]"
                        placeholder="Scholarship essay drafts, honors, volunteering, work experience..."
                      />
                    </FormField>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t bg-muted/40 px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                disabled={stepIndex === 0}
                className={stepIndex === 0 ? 'invisible' : ''}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <div className="flex gap-2">
                {stepIndex < STEPS.length - 1 && (
                  <Button variant="ghost" onClick={nextStep}>
                    Skip for now
                  </Button>
                )}

                {stepIndex === STEPS.length - 1 ? (
                  <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & view matches
                  </Button>
                ) : (
                  <Button type="button" onClick={nextStep}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Match payoff</CardTitle>
                <CardDescription>See what you unlock with these details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge>Ineligible awards removed</Badge>
                  <p>We hide scholarships that do not fit your country, level, or GPA.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Identity boosts</Badge>
                  <p>Tags like Indigenous, LGBTQ+, or women in STEM surface targeted awards.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Activities to essay</Badge>
                  <p>We turn your roles into prompts and hooks for the essay coach.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="text-lg">Profile preview</CardTitle>
                <CardDescription>What the AI will use to rank matches.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {previewSummary ? (
                  <p className="whitespace-pre-wrap text-foreground">{previewSummary}</p>
                ) : (
                  <p>Start filling your basics to see the preview.</p>
                )}
                <div className="text-xs text-muted-foreground">
                  Stored securely, editable anytime. Use the Dashboard to tweak preferences later.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  )
}

function formatTag(tag: string) {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default OnboardingPage
