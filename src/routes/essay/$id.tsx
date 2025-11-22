import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react'
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
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
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [lastSaved, setLastSaved] = React.useState<string | null>(null)
  const [rubricItems, setRubricItems] = React.useState<any[]>([])
  const [scholarshipName, setScholarshipName] = React.useState('')
  const [prompt, setPrompt] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
            setEssayContent(draftJson.draft.content as string)
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
      const res = await fetch('/api/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      toast.success('Analysis complete! Check the rubric feedback.')
    } catch (e: any) {
      toast.error(String(e.message || e))
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Toolbar */}
      <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link
            to="/scholarship/$id"
            params={{ id }}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-sm font-semibold leading-none">
              {loading ? 'Loading…' : scholarshipName || 'Scholarship'}
            </h1>
            <span className="text-xs text-muted-foreground">
              Personal Statement
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved at {lastSaved}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {essayContent.split(/\s+/).filter((w) => w.length > 0).length} words
          </span>
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
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor (Left/Main) */}
        <div className="flex flex-1 flex-col overflow-hidden border-r bg-muted/10">
          <div className="border-b bg-background p-4">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Prompt
            </h2>
            <p className="text-sm leading-relaxed">{prompt}</p>
          </div>
          <div className="flex-1 overflow-auto p-4 lg:p-8">
            <div className="mx-auto max-w-3xl rounded-lg border bg-background shadow-sm">
              <Textarea
                value={essayContent}
                onChange={(e) => setEssayContent(e.target.value)}
                placeholder="Start writing your essay here..."
                className="min-h-[600px] w-full resize-none border-0 p-6 text-base leading-relaxed focus-visible:ring-0 lg:text-lg"
              />
            </div>
          </div>
        </div>

        {/* Sidebar (Right) - Rubric & Tools */}
        <div className="hidden w-80 flex-col border-l bg-background lg:flex xl:w-96">
          <Tabs defaultValue="rubric" className="flex h-full flex-col">
            <div className="border-b px-4 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="rubric" className="flex-1">
                  Rubric
                </TabsTrigger>
                <TabsTrigger value="ideas" className="flex-1">
                  Ideas
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="rubric" className="flex-1 overflow-auto p-0">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">Current Score</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold">72</span>
                      <span className="mb-1 text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>

                  <div className="space-y-4">
                    {rubricItems.map((item, i) => (
                      <Card key={i} className="overflow-hidden">
                        <div
                          className={`h-1 w-full ${
                            item.status === 'good'
                              ? 'bg-green-500'
                              : item.status === 'needs-improvement'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                        />
                        <CardHeader className="p-3 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {item.criteria}
                            </CardTitle>
                            <Badge
                              variant="secondary"
                              className={
                                item.status === 'good'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : item.status === 'needs-improvement'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }
                            >
                              {item.score}/{item.maxScore}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-xs text-muted-foreground">
                            {item.feedback}
                          </p>
                        </CardContent>
                        <CardFooter className="bg-muted/50 p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-full text-xs"
                          >
                            <Wand2 className="mr-2 h-3 w-3" />
                            Improve this
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="ideas" className="flex-1 p-4">
              <div className="space-y-4">
                <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-900/20">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Lightbulb className="h-4 w-4" />
                    <h4 className="font-medium">Brainstorming</h4>
                  </div>
                  <p className="mt-2 text-sm text-blue-600 dark:text-blue-300">
                    Try connecting your robotics club experience to the "Innovation" theme.
                  </p>
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
