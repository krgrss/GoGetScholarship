import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { Wand2, Sparkles, BookOpen, CopyCheck, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type Personality = {
  weights: Record<string, number>
  themes: string[]
  tone: string
  constraints?: string[]
  notes?: string[]
}

type RubricItem = {
  id: string
  name: string
  description?: string
  weight?: number
}

export const Route = createFileRoute('/custom')({
  component: CustomScholarshipLab,
})

function CustomScholarshipLab() {
  const [adminKey, setAdminKey] = React.useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('admin_key') || ''
  })
  const [scholarshipName, setScholarshipName] = React.useState('')
  const [scholarshipText, setScholarshipText] = React.useState('')
  const [personality, setPersonality] = React.useState<Personality | null>(null)
  const [personalityError, setPersonalityError] = React.useState<string | null>(null)
  const [personalityLoading, setPersonalityLoading] = React.useState(false)
  const [essayText, setEssayText] = React.useState('')
  const [draftLoading, setDraftLoading] = React.useState(false)
  const [draftError, setDraftError] = React.useState<string | null>(null)
  const [rubric, setRubric] = React.useState<RubricItem[]>(() => defaultRubric())

  // Compare view
  const [essayA, setEssayA] = React.useState('')
  const [essayB, setEssayB] = React.useState('')
  const [compareLoading, setCompareLoading] = React.useState(false)
  const [compareError, setCompareError] = React.useState<string | null>(null)
  const [compareResult, setCompareResult] = React.useState<{ a: any; b: any } | null>(null)
  const [storyText, setStoryText] = React.useState('')
  const [angleA, setAngleA] = React.useState('Leadership focus')
  const [angleB, setAngleB] = React.useState('Innovation/impact focus')
  const [reframeLoading, setReframeLoading] = React.useState(false)
  const [reframeError, setReframeError] = React.useState<string | null>(null)
  const [reframeDraftA, setReframeDraftA] = React.useState('')
  const [reframeDraftB, setReframeDraftB] = React.useState('')
  const [reframeGrades, setReframeGrades] = React.useState<{ a: any; b: any } | null>(null)
  const jsonHeaders = React.useCallback(
    (): HeadersInit =>
      adminKey
        ? { 'Content-Type': 'application/json', 'admin-api-key': adminKey }
        : { 'Content-Type': 'application/json' },
    [adminKey],
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (adminKey) {
      localStorage.setItem('admin_key', adminKey)
    }
  }, [adminKey])

  function defaultRubric(): RubricItem[] {
    return [
      { id: 'fit', name: 'Fit to scholarship', description: 'Addresses what the sponsor cares about', weight: 0.4 },
      { id: 'clarity', name: 'Clarity & structure', description: 'Clear, organized, and easy to follow', weight: 0.2 },
      { id: 'impact', name: 'Impact & evidence', description: 'Specific examples with measurable impact', weight: 0.2 },
      { id: 'voice', name: 'Voice & authenticity', description: 'Personal, authentic voice without fluff', weight: 0.2 },
    ]
  }

  async function handlePersonality() {
    if (!scholarshipText.trim()) {
      setPersonalityError('Add scholarship text first.')
      return
    }
    setPersonalityError(null)
    setPersonalityLoading(true)
    try {
      const res = await fetch('/api/personality', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          scholarship_name: scholarshipName || 'Custom scholarship',
          raw_text: scholarshipText,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || `Personality failed (${res.status})`)
      }
      setPersonality(json.personality as Personality)
    } catch (e: any) {
      setPersonalityError(String(e.message || e))
      setPersonality(null)
    } finally {
      setPersonalityLoading(false)
    }
  }

  async function handleDraft() {
    if (!personality) {
      setDraftError('Run personality first.')
      return
    }
    setDraftLoading(true)
    setDraftError(null)
    try {
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
        headers: jsonHeaders(),
        body: JSON.stringify({
          scholarship_name: scholarshipName || 'Custom scholarship',
          scholarship_text: scholarshipText,
          personality,
          rubric,
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

  async function gradeSingle(text: string) {
    const res = await fetch('/api/grade-essay', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        text,
        rubric,
      }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      throw new Error(json?.error || `Grade failed (${res.status})`)
    }
    return json.result
  }

  async function handleCompare() {
    if (!essayA.trim() || !essayB.trim()) {
      setCompareError('Add both essays to compare.')
      return
    }
    if (!rubric.length) {
      setCompareError('Rubric is required to grade.')
      return
    }
    setCompareError(null)
    setCompareLoading(true)
    try {
      const [a, b] = await Promise.all([gradeSingle(essayA), gradeSingle(essayB)])
      setCompareResult({ a, b })
    } catch (e: any) {
      setCompareError(String(e.message || e))
    } finally {
      setCompareLoading(false)
    }
  }

  async function handleReframe() {
    if (!personality) {
      setReframeError('Run personality first.')
      return
    }
    if (!storyText.trim()) {
      setReframeError('Add 1-2 core stories.')
      return
    }
    setReframeError(null)
    setReframeLoading(true)
    setReframeDraftA('')
    setReframeDraftB('')
    setReframeGrades(null)
    const stories = storyText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    try {
      const baseProfile =
        (typeof window !== 'undefined' &&
          localStorage.getItem('scholarship_profile') &&
          JSON.parse(localStorage.getItem('scholarship_profile') || '{}')) ||
        {}
      const studentId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('scholarship_student_id') ||
            localStorage.getItem('student_id'))) ||
        undefined
      const draftReq = async (style: string) => {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify({
            scholarship_name: scholarshipName || 'Custom scholarship',
            scholarship_text: scholarshipText,
            personality,
            rubric,
            student_id: studentId || undefined,
            student_profile: {
              name: baseProfile.name,
              gpa: baseProfile.gpa ? Number(baseProfile.gpa) : undefined,
              major: baseProfile.major,
              country: baseProfile.country,
              activities: [],
              awards: [],
              projects: [],
              background: baseProfile.backgroundTags || [],
              stories,
            },
            style,
            word_target: 350,
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.ok) {
          throw new Error(json?.error || `Draft failed (${res.status})`)
        }
        return json.draft as string
      }

      const [draftA, draftB] = await Promise.all([
        draftReq(angleA),
        draftReq(angleB),
      ])
      setReframeDraftA(draftA)
      setReframeDraftB(draftB)
      const [gradedA, gradedB] = await Promise.all([
        gradeSingle(draftA),
        gradeSingle(draftB),
      ])
      setReframeGrades({ a: gradedA, b: gradedB })
    } catch (e: any) {
      setReframeError(String(e.message || e))
    } finally {
      setReframeLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Wand2 className="h-3.5 w-3.5" />
            Custom Scholarship Lab
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Bring your own scholarship</h1>
          <p className="text-sm text-muted-foreground">
            Paste any scholarship text, generate personality + rubric, draft an essay, and compare essays side by side.
            Admin key required for AI calls.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="adminKey" className="text-xs text-muted-foreground">
              Admin key
            </Label>
            <Input
              id="adminKey"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="h-8 w-64 text-xs"
              placeholder="ADMIN_API_KEY"
            />
            {!adminKey && (
              <p className="text-[11px] text-destructive">
                Required for /api/personality, /api/draft, /api/grade-essay, /api/revise
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Bring your own scholarship
              </CardTitle>
              <CardDescription>
                Paste the description or URL text. We’ll generate personality + rubric and let you draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Scholarship name (optional)</Label>
                <Input
                  value={scholarshipName}
                  onChange={(e) => setScholarshipName(e.target.value)}
                  placeholder="e.g., Women in STEM Excellence Award"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Scholarship text</Label>
                <Textarea
                  value={scholarshipText}
                  onChange={(e) => setScholarshipText(e.target.value)}
                  rows={8}
                  placeholder="Paste the description / eligibility here..."
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handlePersonality} disabled={personalityLoading}>
                  {personalityLoading ? 'Generating…' : 'Generate personality + rubric'}
                </Button>
                {personalityError && (
                  <span className="text-xs text-destructive">{personalityError}</span>
                )}
              </div>

              {personality && (
                <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Personality
                  </p>
                  <div className="space-y-2">
                    {Object.entries(personality.weights).map(([k, v]) => (
                      <div key={k} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{k}</span>
                          <span>{v.toFixed(2)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.min(100, Math.round(v * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {personality.themes?.length > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      Themes: {personality.themes.join(', ')}
                    </div>
                  )}
                  {personality.tone && (
                    <div className="text-[11px] text-muted-foreground">Tone: {personality.tone}</div>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Draft essay</p>
                  <Button size="sm" variant="outline" onClick={handleDraft} disabled={draftLoading}>
                    {draftLoading ? 'Drafting…' : 'Draft with AI'}
                  </Button>
                </div>
                {draftError && <p className="text-xs text-destructive">{draftError}</p>}
                <Textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  rows={10}
                  placeholder="Your essay will appear here..."
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                Rubric (editable)
              </CardTitle>
              <CardDescription className="text-xs">
                Tweak the rubric used for drafting and grading.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {rubric.map((item, idx) => (
                <div key={item.id} className="space-y-1 rounded-md border border-border bg-background p-2">
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      const next = [...rubric]
                      next[idx] = { ...next[idx], name: e.target.value }
                      setRubric(next)
                    }}
                    className="h-8 text-xs"
                  />
                  <Textarea
                    value={item.description ?? ''}
                    onChange={(e) => {
                      const next = [...rubric]
                      next[idx] = { ...next[idx], description: e.target.value }
                      setRubric(next)
                    }}
                    rows={2}
                    className="text-xs"
                    placeholder="Description (optional)"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CopyCheck className="h-4 w-4 text-primary" />
              Compare essays (grade with rubric)
            </CardTitle>
            <CardDescription className="text-xs">
              Paste two essays, grade both with the rubric above, and see readiness/criteria side by side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Essay A</Label>
                <Textarea
                  value={essayA}
                  onChange={(e) => setEssayA(e.target.value)}
                  rows={6}
                  className="text-sm"
                  placeholder="Paste essay A..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Essay B</Label>
                <Textarea
                  value={essayB}
                  onChange={(e) => setEssayB(e.target.value)}
                  rows={6}
                  className="text-sm"
                  placeholder="Paste essay B..."
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleCompare} disabled={compareLoading}>
                {compareLoading ? 'Grading…' : 'Grade & compare'}
              </Button>
              {compareError && <span className="text-destructive">{compareError}</span>}
            </div>
            {compareResult && (
              <div className="grid gap-3 md:grid-cols-2">
                <CompareCard title="Essay A" result={compareResult.a} />
                <CompareCard title="Essay B" result={compareResult.b} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Story Reframer
            </CardTitle>
            <CardDescription className="text-xs">
              Enter 1–2 core stories and generate two drafts with different angles, then grade both.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Stories (1–2)</Label>
              <Textarea
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                rows={4}
                className="text-sm"
                placeholder="e.g., Community leadership project; STEM research internship"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Angle A</Label>
                <Input value={angleA} onChange={(e) => setAngleA(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium">Angle B</Label>
                <Input value={angleB} onChange={(e) => setAngleB(e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleReframe} disabled={reframeLoading}>
                {reframeLoading ? 'Generating…' : 'Generate & grade'}
              </Button>
              {reframeError && <span className="text-destructive">{reframeError}</span>}
            </div>
            {(reframeDraftA || reframeDraftB) && (
              <div className="grid gap-3 md:grid-cols-2">
                {reframeDraftA && (
                  <div className="space-y-2 rounded-md border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-foreground">Draft A ({angleA})</p>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{reframeDraftA}</p>
                    {reframeGrades?.a && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="font-normal">
                          {reframeGrades.a.readiness}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground">{reframeGrades.a.overall_comment}</p>
                      </div>
                    )}
                  </div>
                )}
                {reframeDraftB && (
                  <div className="space-y-2 rounded-md border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-foreground">Draft B ({angleB})</p>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{reframeDraftB}</p>
                    {reframeGrades?.b && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="font-normal">
                          {reframeGrades.b.readiness}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground">{reframeGrades.b.overall_comment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {personalityError && !adminKey && (
          <div className="inline-flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Admin key is required for AI calls.</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CompareCard({ title, result }: { title: string; result: any }) {
  if (!result) return null
  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-3 text-xs">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="outline" className="font-normal">
          {result.readiness}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">{result.overall_comment}</p>
      <ul className="space-y-1.5">
        {result.criteria?.map((c: any) => (
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
}
