import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

type StepKey = 'basics' | 'background' | 'about'

const STEPS: { key: StepKey; label: string; optional?: boolean }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'background', label: 'Background', optional: true },
  { key: 'about', label: 'About you', optional: true },
]

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const [stepIndex, setStepIndex] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
    setError(null)
    if (stepIndex === 0 && (!country || !level)) {
      setError('Please fill in at least your country and level of study.')
      return
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function prevStep() {
    setError(null)
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      // Placeholder: in a later iteration, this will POST to /api/profile.
      await new Promise((resolve) => setTimeout(resolve, 600))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h1 className="font-display text-2xl leading-snug sm:text-3xl">
            Let&apos;s get to know you.
          </h1>
          <p className="text-sm text-muted-foreground">
            A few quick questions so we can find scholarships that are actually realistic
            for you.
          </p>
        </header>

        <section className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <div className="mb-4 flex items-center gap-2 text-xs">
            {STEPS.map((step, idx) => (
              <div
                key={step.key}
                className={`flex-1 rounded-full px-2 py-1 text-center ${
                  idx === stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.label}
                {step.optional && ' (optional)'}
              </div>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {currentStep.key === 'basics' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Country of study
                  </label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. Canada, United States"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Level of study
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select level</option>
                    <option value="hs">High school</option>
                    <option value="ug">Undergraduate</option>
                    <option value="grad">Graduate</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Intended / current program or major
                  </label>
                  <input
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. Computer Science, Nursing"
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      GPA
                    </label>
                    <input
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      className="w-24 rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="3.7"
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      GPA scale
                    </label>
                    <select
                      value={gpaScale}
                      onChange={(e) => setGpaScale(e.target.value)}
                      className="w-28 rounded-full border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="4.0">4.0</option>
                      <option value="4.3">4.3</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep.key === 'background' && (
              <div className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  These questions are optional and only used to surface targeted
                  scholarships. You can skip this step at any time.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'First-generation student',
                    'Low-income background',
                    'International student',
                    'Disability',
                    'LGBTQ+',
                    'Underrepresented race/ethnicity',
                  ].map((tag) => {
                    const active = backgroundTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleBackgroundTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm ring-1 ${
                          active
                            ? 'bg-secondary text-secondary-foreground ring-secondary'
                            : 'bg-background text-muted-foreground ring-border hover:bg-muted'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {currentStep.key === 'about' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Activities / about you
                  </label>
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rows={6}
                    placeholder="Paste your activities, roles, important projects, or anything else you want us to know."
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  File uploads (resumes, transcripts) are out of scope for this prototype,
                  but this box can stand in for that content.
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Back
                  </button>
                )}
                {stepIndex < STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Continue
                  </button>
                )}
                {stepIndex === STEPS.length - 1 && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {saving ? 'Saving profile…' : 'Save profile & see matches'}
                  </button>
                )}
              </div>

              {currentStep.optional && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="text-[11px] font-medium text-muted-foreground underline underline-offset-4"
                >
                  Skip this step
                </button>
              )}
            </div>
          </form>

          {stepIndex === 0 && (
            <p className="mt-4 text-[11px] text-muted-foreground">
              You can update this information later from your profile. We just need enough
              to avoid clearly bad matches.
            </p>
          )}
        </section>

        <p className="text-[11px] text-muted-foreground">
          Already set up?{' '}
          <Link
            to="/matches"
            className="font-medium text-primary underline underline-offset-4"
          >
            Jump straight to your matches.
          </Link>
        </p>
      </main>
    </div>
  )
}

