import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Bold,
  Lightbulb,
  List,
  MessageSquare,
  RefreshCw,
  Save,
  Sparkles,
  Italic,
  Underline,
  Wand2,
} from 'lucide-react'
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export const Route = createFileRoute('/essay/$id')({
  component: EssayWorkspacePage,
})

function EssayWorkspacePage() {
  const { id } = Route.useParams()
  const [essayContent, setEssayContent] = React.useState('')
  const [editorHtml, setEditorHtml] = React.useState('')
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<string | null>(null)
  const [rubricItems, setRubricItems] = React.useState<any[]>([])
  const [scholarshipName, setScholarshipName] = React.useState('')
  const [prompt, setPrompt] = React.useState('')
  const [promptHighlightHtml, setPromptHighlightHtml] = React.useState<string | null>(null)
  const [promptExplanation, setPromptExplanation] = React.useState<string | null>(null)
  const [promptLoading, setPromptLoading] = React.useState(false)
  const [status, setStatus] = React.useState<'draft' | 'revising' | 'ready'>('draft')
  const [sidebarTab, setSidebarTab] = React.useState<'rubric' | 'ideas' | 'history' | 'coach'>('rubric')
  const [ideas, setIdeas] = React.useState<{ hooks: string[]; storyPrompts: string[]; gaps: string[] }>({
    hooks: [],
    storyPrompts: [],
    gaps: [],
  })
  const [chatMessages, setChatMessages] = React.useState<{ role: 'system' | 'user' | 'assistant'; text: string }[]>([
    { role: 'system', text: 'Ask how to improve this essay for this scholarship. We use prompt, rubric, and your current draft.' },
  ])
  const [chatInput, setChatInput] = React.useState('')
  const [coachLoading, setCoachLoading] = React.useState(false)
  const [profileCtx, setProfileCtx] = React.useState<{ summary?: string; gender?: string; identityTags?: string[] }>({})
  const wordCount = React.useMemo(
    () => essayContent.split(/\s+/).filter((w) => w.length > 0).length,
    [essayContent],
  )
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [analyzedAt, setAnalyzedAt] = React.useState<string | null>(null)
  const [overallScore, setOverallScore] = React.useState<number | null>(null)
  const [historyItems, setHistoryItems] = React.useState<
    { id: string; label: string; createdAt: string; content: string }[]
  >([])
  const editorRef = React.useRef<HTMLDivElement | null>(null)

  const htmlFromText = React.useCallback((text: string) => {
    if (!text) return ''
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return escaped.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
  }, [])

  const plainFromHtml = React.useCallback((html: string) => {
    if (!html) return ''
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedProfile = localStorage.getItem('scholarship_profile')
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile)
        setProfileCtx({
          summary: parsed.summary,
          gender: parsed.gender,
          identityTags: parsed.identityTags,
        })
      }
    } catch (e) {
      console.error('Failed to load profile context for essay workspace', e)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (typeof window === 'undefined') return
      setLoading(true)
      setError(null)
      try {
        const [scholarRes, rubricRes] = await Promise.all([
          fetch(`/api/scholarship/${id}`),
          fetch(`/api/rubric?scholarship_id=${encodeURIComponent(id)}`),
        ])
        const schJson = await scholarRes.json()
        if (!scholarRes.ok || !schJson.ok) {
          throw new Error(schJson?.error || 'Failed to load scholarship')
        }
        const sch = schJson.scholarship as { name: string; metadata?: any }
        const meta = (sch.metadata ?? {}) as any
        const prompts: string[] = Array.isArray(meta.essay_prompts_raw)
          ? meta.essay_prompts_raw
          : []

        const rubricJson = await rubricRes.json().catch(() => null)
        if (rubricRes.ok && rubricJson?.ok && Array.isArray(rubricJson.rubric)) {
          setRubricItems(rubricJson.rubric)
        }

        if (!cancelled) {
          setScholarshipName(sch.name)
          setPrompt(
            prompts[0] ||
              'Describe a significant experience or story that shows why you are a strong fit for this scholarship.',
          )
          setHistoryItems([
            {
              id: crypto.randomUUID(),
              label: 'Auto-save',
              createdAt: new Date().toLocaleTimeString(),
              content: '',
            },
          ])
        }

        const studentId =
          localStorage.getItem('scholarship_student_id') ||
          localStorage.getItem('student_id')
        if (studentId) {
          const draftRes = await fetch(
            `/api/drafts?student_id=${encodeURIComponent(
              studentId,
            )}&scholarship_id=${encodeURIComponent(id)}`,
          )
          const draftJson = await draftRes.json()
          if (
            draftRes.ok &&
            draftJson.ok &&
            draftJson.draft?.content &&
            !cancelled
          ) {
            const draftText = draftJson.draft.content as string
            setEssayContent(draftText)
            setEditorHtml(htmlFromText(draftText))
            if (draftJson.draft.updated_at && !cancelled) {
              setLastSaved(draftJson.draft.updated_at as string)
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(String(e.message || e))
        }
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

  const handleSave = async () => {
    if (!essayContent.trim()) {
      toast.error('Please write some content first')
      return
    }
    setIsSaving(true)
    try {
      const studentId =
        localStorage.getItem('scholarship_student_id') ||
        localStorage.getItem('student_id')
      if (!studentId) {
        throw new Error('No student profile found. Complete onboarding first.')
      }

      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          scholarship_id: id,
          content: essayContent,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || 'Failed to save draft')
      }
      setLastSaved(new Date().toLocaleTimeString())
      setHistoryItems((prev) => [
        {
          id: crypto.randomUUID(),
          label: 'Manual save',
          createdAt: new Date().toLocaleTimeString(),
          content: essayContent,
        },
        ...prev,
      ])
      toast.success('Draft saved successfully')
    } catch (e: any) {
      toast.error(String(e.message || e))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAnalyze = async () => {
    if (!essayContent.trim()) {
      toast.error('Please write some content first')
      return
    }
    if (!rubricItems.length) {
      toast.error('No rubric configured for this scholarship yet.')
      return
    }
    setIsAnalyzing(true)
    try {
      const adminKey =
        (typeof window !== 'undefined' && localStorage.getItem('admin_key')) ||
        (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_ADMIN_API_KEY : '') ||
        ''
      const res = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'admin-api-key': adminKey } : {}),
        },
        body: JSON.stringify({
          text: essayContent,
          rubric: rubricItems,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json?.error || 'Failed to analyze essay')
      }
      setRubricItems(json.result?.criteria || [])
      if (typeof json.result?.overall_score === 'number') {
        setOverallScore(json.result.overall_score)
        if (json.result.overall_score >= 80) setStatus('ready')
        else if (json.result.overall_score >= 60) setStatus('revising')
      }
      setAnalyzedAt(new Date().toLocaleTimeString())
      toast.success('Analysis complete! Check the rubric feedback.')
    } catch (e: any) {
      toast.error(String(e.message || e))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTransform = async (mode: string) => {
    if (!essayContent.trim()) {
      toast.error('Write something first.')
      return
    }
    const adminKey =
      (typeof window !== 'undefined' && localStorage.getItem('admin_key')) ||
      (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_ADMIN_API_KEY : '') ||
      ''
    try {
      const res = await fetch('/api/essay/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'admin-api-key': adminKey } : {}),
        },
        body: JSON.stringify({
          essayId: id,
          mode,
          contentPlain: essayContent,
          studentProfile: profileCtx,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Transform failed')
      setHistoryItems((prev) => [
        {
          id: crypto.randomUUID(),
          label: `Before ${mode}`,
          createdAt: new Date().toLocaleTimeString(),
          content: essayContent,
        },
        ...prev,
      ])
      if (json.replacementText) {
        setEssayContent(json.replacementText)
        setEditorHtml(htmlFromText(json.replacementText))
      } else if (json.fullContentHtml) {
        const plain = plainFromHtml(json.fullContentHtml)
        setEssayContent(plain)
        setEditorHtml(json.fullContentHtml)
      }
      toast.success('Applied AI suggestion')
    } catch (e: any) {
      toast.error(String(e.message || e))
    }
  }

  const loadIdeas = async () => {
    if (!prompt) return
    try {
      const res = await fetch('/api/essay/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayId: id,
          scholarshipId: id,
          prompt,
          existingContent: essayContent,
          studentProfile: profileCtx,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to load ideas')
      setIdeas({
        hooks: json.hooks ?? [],
        storyPrompts: json.storyPrompts ?? [],
        gaps: json.gaps ?? [],
      })
    } catch {
      setIdeas((prev) =>
        prev.hooks.length || prev.storyPrompts.length || prev.gaps.length
          ? prev
          : {
              hooks: [
                'Open with the moment you decided to launch your project.',
                'Start with a vivid, one-sentence snapshot of the impact.',
              ],
              storyPrompts: [
                'Describe the toughest obstacle you faced while leading this initiative.',
                'Recall a conversation that changed how you approached the project.',
              ],
              gaps: [
                'Add a concrete metric for impact.',
                'Reflect briefly on what you learned about yourself.',
              ],
            },
      )
    }
  }

  const handleSendChat = (message?: string) => {
    const text = (message ?? chatInput).trim()
    if (!text || coachLoading) return
    setChatMessages((prev) => [...prev, { role: 'user', text }])
    setChatInput('')
    setCoachLoading(true)
    fetch('/api/essay/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        essayId: id,
        prompt,
        content: essayContent,
        rubric: rubricItems,
        message: text,
        studentProfile: profileCtx,
      }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.ok) throw new Error(json?.error || 'Coach failed')
        const reply = json.reply || 'Here are targeted, rubric-aware suggestions based on your draft and prompt.'
        setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }])
      })
      .catch((e: any) => {
        setChatMessages((prev) => [...prev, { role: 'assistant', text: String(e.message || e) }])
      })
      .finally(() => setCoachLoading(false))
  }

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = (e.target as HTMLDivElement).innerHTML
    setEditorHtml(html)
    setEssayContent(plainFromHtml(html))
  }

  const applyFormat = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
    if (typeof document === 'undefined') return
    document.execCommand(command)
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      setEditorHtml(html)
      setEssayContent(plainFromHtml(html))
    }
  }

  const handleHighlightVerbs = () => {
    if (!prompt) return
    const highlighted = prompt.replace(/\b([\w]+ing|[\w]+ed|\w+ify|\w+ize|\w+ate)\b/gi, '<mark class="bg-amber-100 text-amber-900">$1</mark>')
    setPromptHighlightHtml(highlighted)
  }

  const handleExplainPrompt = async () => {
    if (!prompt) return
    setPromptLoading(true)
    setPromptExplanation(null)
    try {
      const res = await fetch('/api/essay/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayId: id,
          prompt,
          content: essayContent,
          rubric: rubricItems,
          message: 'Explain this prompt simply and list the top 3 things to cover.',
          mode: 'prompt_explain',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || 'Failed to explain prompt')
      setPromptExplanation(json.reply || 'Focus on answering the prompt directly with concrete examples.')
    } catch (e: any) {
      setPromptExplanation(String(e.message || e))
    } finally {
      setPromptLoading(false)
    }
  }

  const scrollToEditor = () => {
    if (!editorRef.current) return
    editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    editorRef.current.focus({ preventScroll: true })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Toolbar */}
      <header className="flex flex-col border-b bg-background px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/scholarship/$id"
              params={{ id }}
              search={{ score: undefined, eligibility: undefined }}
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to scholarship
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-base font-semibold leading-none">
                {scholarshipName || 'Essay workspace'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{loading ? 'Loadingâ€¦' : scholarshipName || 'Scholarship'}</span>
                <Badge variant="outline" className="text-[11px]">
                  Status: {status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">Saved at {lastSaved}</span>
            )}
            {analyzedAt && (
              <span className="text-xs text-muted-foreground">AI readiness updated {analyzedAt}</span>
            )}
            <Badge variant="secondary" className="text-[11px]">
              Word count: {wordCount}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-2 h-3.5 w-3.5" />
              )}
              Save
            </Button>
            <Button size="sm" onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3.5 w-3.5" />
              )}
              Analyze with AI
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Prompt: {prompt ? `${prompt.slice(0, 80)}...` : 'Not provided'}</span>
          {overallScore != null && (
            <Badge variant="outline" className="text-[11px]">
              AI readiness: {overallScore}/100
            </Badge>
          )}
        </div>
        {error && (
          <div className="mt-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-auto">
        {/* Editor (Left/Main) */}
        <div className="flex flex-1 flex-col overflow-auto border-r bg-muted/10">
          <div className="grid gap-3 border-b bg-background p-4 lg:grid-cols-[1.2fr_1fr] lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div
                  className="text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: promptHighlightHtml ?? prompt,
                  }}
                />
                {promptExplanation && (
                  <p className="text-xs text-muted-foreground">Prompt notes: {promptExplanation}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Button size="sm" variant="outline" onClick={handleHighlightVerbs}>
                    Highlight key verbs
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleExplainPrompt} disabled={promptLoading}>
                    Explain this prompt
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Essay status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">Status: {status}</Badge>
                <Badge variant="secondary">Word count: {wordCount}</Badge>
                {overallScore != null && <Badge variant="secondary">AI readiness: {overallScore}/100</Badge>}
                {analyzedAt && <span className="text-muted-foreground">Last scored {analyzedAt}</span>}
              </CardContent>
            </Card>
          </div>
          <div className="flex-1 p-4 lg:p-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-lg border bg-background shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleTransform('rewrite_clearer')}>
                    <Wand2 className="mr-2 h-3.5 w-3.5" />
                    Improve clarity
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleTransform('suggest_next_sentence')}>
                    <Wand2 className="mr-2 h-3.5 w-3.5" />
                    Suggest next sentence
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleTransform('reorganize_structure')}>
                    <Wand2 className="mr-2 h-3.5 w-3.5" />
                    Re-organize structure
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Draft Â· Auto-saves when you make changes
                </div>
              </div>
              <div className="flex flex-wrap gap-1 border-b px-4 py-2 text-xs text-muted-foreground">
                <Button size="sm" variant="ghost" onClick={() => applyFormat('bold')}>
                  <Bold className="mr-1 h-3.5 w-3.5" />
                  Bold
                </Button>
                <Button size="sm" variant="ghost" onClick={() => applyFormat('italic')}>
                  <Italic className="mr-1 h-3.5 w-3.5" />
                  Italic
                </Button>
                <Button size="sm" variant="ghost" onClick={() => applyFormat('underline')}>
                  <Underline className="mr-1 h-3.5 w-3.5" />
                  Underline
                </Button>
                <Button size="sm" variant="ghost" onClick={() => applyFormat('insertUnorderedList')}>
                  <List className="mr-1 h-3.5 w-3.5" />
                  Bullets
                </Button>
              </div>
                <div className="px-6 py-4">
                  <div
                    ref={editorRef}
                    contentEditable
                    dir="ltr"
                    onInput={handleEditorInput}
                    className="min-h-[480px] w-full rounded-md border bg-white px-4 py-3 text-base leading-relaxed shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:text-lg text-left"
                    dangerouslySetInnerHTML={{ __html: editorHtml || '<p><br/></p>' }}
                  />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className={wordCount > 650 ? 'text-destructive' : ''}>{wordCount} / 650 words</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Reading level: ~Grade 9</span>
                </div>
                <div className="flex items-center gap-2">
                  {overallScore != null && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                      AI readiness: {overallScore}/100
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                    Analyze
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Right) - Rubric & Tools */}
        <div className="hidden w-80 flex-col border-l bg-background lg:flex xl:w-96">
          <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)} className="flex h-full flex-col">
            <div className="border-b px-4 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="rubric" className="flex-1">
                  Rubric
                </TabsTrigger>
                <TabsTrigger value="ideas" className="flex-1" onClick={loadIdeas}>
                  Ideas
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  History
                </TabsTrigger>
                <TabsTrigger value="coach" className="flex-1">
                  Coach
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="rubric" className="flex-1 overflow-auto p-0">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">Overall readiness</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold">{overallScore ?? 0}</span>
                      <span className="mb-1 text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={overallScore ?? 0} className="h-2" />
                    <p className="text-[11px] text-muted-foreground">
                      Estimated by AI using this scholarship&apos;s rubric and winner patterns.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {rubricItems.map((item, i) => (
                      <Card key={i} className="overflow-hidden">
                        <div className="flex items-center justify-between px-3 pt-3">
                          <CardTitle className="text-sm font-medium leading-tight">
                            {item.criteria || item.name}
                          </CardTitle>
                          <Badge variant="secondary">{item.score}/{item.maxScore || 5}</Badge>
                        </div>
                        <CardContent className="p-3 pt-1">
                          <p className="text-xs text-muted-foreground">
                            {item.feedback || item.description || 'AI feedback will appear here.'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => handleTransform('rewrite_clearer')}>
                              <Wand2 className="mr-2 h-3 w-3" />
                              Improve this area
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={scrollToEditor}>
                              Focus in editor
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="ideas" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-900/20">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Lightbulb className="h-4 w-4" />
                    <h4 className="font-medium">Story prompts</h4>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    {ideas.storyPrompts.length
                      ? ideas.storyPrompts.map((s, i) => <li key={i}>- {s}</li>)
                      : ["Talk about a time you led under pressure.", "Think of a moment when you changed someone's mind."].map((s, i) => (
                          <li key={i}>- {s}</li>
                        ))}
                  </ul>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <h4 className="font-medium text-sm">Hook ideas</h4>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {(ideas.hooks.length ? ideas.hooks : ['Lead with a vivid moment where you took initiative.']).map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2">
                        <span>{h}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => {
                          const next = `${h}\n\n${essayContent}`
                          setEssayContent(next)
                          setEditorHtml(htmlFromText(next))
                        }}>
                          Insert
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <h4 className="font-medium text-sm">Gaps to address</h4>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {(ideas.gaps.length ? ideas.gaps : ['Add outcome + metric', 'Reflect on what you learned']).map((g, i) => (
                      <li key={i}>- {g}</li>
                    ))}
                  </ul>
                </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
              <div className="space-y-3 text-sm">
                {historyItems.length === 0 && (
                  <p className="text-muted-foreground">Versions will appear after saves or AI transforms.</p>
                )}
                {historyItems.map((h) => (
                  <Card key={h.id}>
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{h.label}</span>
                        <span className="text-[11px] text-muted-foreground">{h.createdAt}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 text-xs text-muted-foreground">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEssayContent(h.content)
                            setEditorHtml(htmlFromText(h.content))
                          }}
                        >
                          Restore
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(h.content)}>
                          Copy text
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="coach" className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col gap-3 p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    'Is my story actually answering the prompt?',
                    'How can I show more impact?',
                    'Help me strengthen the conclusion.',
                    'Highlight parts that sound generic.',
                  ].map((chip) => (
                    <Button key={chip} size="sm" variant="secondary" onClick={() => handleSendChat(chip)}>
                      {chip}
                    </Button>
                  ))}
                </div>
                <ScrollArea className="flex-1 rounded-md border bg-muted/30 p-3">
                  <div className="space-y-2 text-sm">
                    {chatMessages.map((m, i) => (
                      <div
                        key={i}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <span
                          className={`rounded-lg px-3 py-2 text-xs ${
                            m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border'
                          }`}
                        >
                          {m.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask how to improve this essay..."
                    className="min-h-[60px] text-left"
                    dir="ltr"
                  />
                  <Button onClick={() => handleSendChat()} disabled={coachLoading}>
                    {coachLoading ? 'Thinking...' : 'Send'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile Rubric Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg lg:hidden"
            size="icon"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Rubric Feedback</SheetTitle>
            <SheetDescription>
              Review AI feedback and improve your essay.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 h-full overflow-auto pb-8">
            <div className="space-y-4">
              {rubricItems.map((item, i) => (
                <Card key={i}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {item.criteria}
                      </CardTitle>
                      <Badge variant="outline">
                        {item.score}/{item.maxScore}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">
                      {item.feedback}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}








