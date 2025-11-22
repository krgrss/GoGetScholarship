import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label' // Need to check if Label is installed, usually it is with Input or separate. shadcn add label? I didn't add it. I'll use standard label or add it.
// I didn't add 'label'. I'll use standard <label> with appropriate classes or add it.
// Actually, shadcn Input usually goes with Label. I'll check if I can use standard label.
// Or I can just use <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

type StepKey = 'basics' | 'academics' | 'background' | 'about'

const STEPS: { key: StepKey; label: string; optional?: boolean }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'academics', label: 'Academics' },
  { key: 'background', label: 'Background', optional: true },
  { key: 'about', label: 'About you' },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = React.useState(0)
  const [saving, setSaving] = React.useState(false)

  // Form State
  const [country, setCountry] = React.useState('')
  const [level, setLevel] = React.useState('')
  const [program, setProgram] = React.useState('')
  const [gpa, setGpa] = React.useState('')
  const [gpaScale, setGpaScale] = React.useState('4.0')
  const [backgroundTags, setBackgroundTags] = React.useState<string[]>([])
  const [aboutText, setAboutText] = React.useState('')

  const currentStep = STEPS[stepIndex]

  function toggleBackgroundTag(tag: string) {
    setBackgroundTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function nextStep() {
    if (stepIndex === 0 && !country) {
      toast.error('Please select your country of study.')
      return
    }
    if (stepIndex === 1 && (!level || !program)) {
      toast.error('Please fill in your level and program.')
      return
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function prevStep() {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      // Generate summary
      const summary = `Student from ${country} studying ${program} (${level}). GPA: ${gpa}/${gpaScale}. Background: ${backgroundTags.join(', ')}. About: ${aboutText}`
      
      // Save to local storage so matches page can reuse summary/profile
      const profile = {
        country,
        level,
        program,
        gpa,
        gpaScale,
        backgroundTags,
        aboutText,
        summary,
        completedAt: new Date().toISOString(),
      }
      localStorage.setItem('scholarship_profile', JSON.stringify(profile))

      // Persist profile to backend to get a real student_id + embedding
      const gpaNumber = gpa ? Number(gpa) : undefined
      const scaleNumber = gpaScale ? Number(gpaScale) : undefined
      let normalizedGpa: number | undefined = undefined
      if (typeof gpaNumber === 'number' && !Number.isNaN(gpaNumber)) {
        if (!scaleNumber || scaleNumber === 4 || scaleNumber === 4.0) {
          normalizedGpa = gpaNumber
        } else if (scaleNumber === 100) {
          normalizedGpa = Number((gpaNumber / 25).toFixed(2))
        }
      }

      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: undefined,
          gpa: normalizedGpa,
          major: program || undefined,
          country: country || undefined,
          summary,
          metadata: {
            level,
            gpaScale,
            backgroundTags,
            aboutText,
            source: 'onboarding',
          },
        }),
      })
      const profileData = await profileRes.json()
      if (!profileRes.ok || !profileData.ok) {
        throw new Error(profileData?.error || `Profile save failed (${profileRes.status})`)
      }
      if (profileData.student_id) {
        localStorage.setItem('scholarship_student_id', profileData.student_id)
        localStorage.setItem('student_id', profileData.student_id)
      }

        toast.success('Profile saved!')
        navigate({ to: '/matches' })
      } catch (err) {
        toast.error('Failed to save profile. Please try again.')
      } finally {
        setSaving(false)
      }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {stepIndex + 1}
              </span>
              <span className="font-medium uppercase tracking-wide">
                Step {stepIndex + 1} of {STEPS.length}
              </span>
            </div>
            {currentStep.optional && (
              <Badge variant="secondary" className="font-normal">
                Optional
              </Badge>
            )}
          </div>
          <div>
            <CardTitle className="text-2xl">
              {currentStep.key === 'basics' && 'Where are you studying?'}
              {currentStep.key === 'academics' && 'Academic details'}
              {currentStep.key === 'background' && 'Tell us about your background'}
              {currentStep.key === 'about' && 'What makes you unique?'}
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              {currentStep.key === 'basics' && 'We need this to filter for eligible scholarships.'}
              {currentStep.key === 'academics' && 'Your program and grades help us find academic matches.'}
              {currentStep.key === 'background' && 'Select any that apply to find targeted opportunities.'}
              {currentStep.key === 'about' && 'Paste your bio, activities, or a short intro.'}
            </CardDescription>
          </div>
        </CardHeader>

          <form>
          <CardContent className="space-y-6">
            {currentStep.key === 'basics' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Country of study
                  </label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep.key === 'academics' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Level of study
                  </label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Program / Major
                  </label>
                  <Input
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g. Computer Science, Nursing"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      GPA
                    </label>
                    <Input
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="3.8"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Scale
                    </label>
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
                  </div>
                </div>
              </div>
            )}

            {currentStep.key === 'background' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    'First-generation student',
                    'Low-income background',
                    'International student',
                    'Student with disability',
                    'LGBTQ+',
                    'Woman in STEM',
                    'Indigenous',
                    'Black / African American',
                    'Hispanic / Latino',
                  ].map((tag) => {
                    const active = backgroundTags.includes(tag)
                    return (
                      <Badge
                        key={tag}
                        variant={active ? 'default' : 'outline'}
                        className={`cursor-pointer px-3 py-1.5 text-sm transition-all hover:bg-primary/90 hover:text-primary-foreground ${
                          active ? '' : 'hover:border-primary'
                        }`}
                        onClick={() => toggleBackgroundTag(tag)}
                      >
                        {tag}
                        {active && <Check className="ml-1 h-3 w-3" />}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select all that apply. This helps us find scholarships with specific eligibility requirements.
                </p>
              </div>
            )}

            {currentStep.key === 'about' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Activities & Bio
                  </label>
                  <Textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="I am the president of the debate club... I volunteered at..."
                    className="min-h-[150px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Briefly list your leadership roles, volunteering, and key achievements.
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t bg-muted/10 px-6 py-4">
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
              {currentStep.optional && (
                <Button type="button" variant="ghost" onClick={nextStep}>
                  Skip
                </Button>
              )}
              
              {stepIndex === STEPS.length - 1 ? (
                <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & View Matches
                </Button>
              ) : (
                <Button type="button" onClick={nextStep}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
