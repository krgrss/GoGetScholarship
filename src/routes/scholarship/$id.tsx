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
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/scholarship/$id')({
  component: ScholarshipDetailPage,
})

function ScholarshipDetailPage() {
  const { id } = Route.useParams()

  // Mock Data
  const scholarship = {
    id,
    name: 'First-Gen STEM Innovators Scholarship',
    provider: 'Aurora Foundation',
    amount: 'Up to CAD 12,000',
    frequency: 'Renewable (4 years)',
    deadline: 'Jan 15, 2026',
    daysLeft: '45 days left',
    description:
      'The Aurora Foundation supports the next generation of STEM leaders who are the first in their families to attend university. We are looking for students who demonstrate academic excellence, resilience, and a commitment to community service.',
    eligibility: [
      'Must be a first-generation university student.',
      'Must be enrolling in a STEM program at a Canadian university.',
      'Minimum GPA of 3.5/4.0.',
      'Demonstrated financial need.',
    ],
    themes: ['Resilience', 'Innovation', 'Community Impact'],
    rubric: [
      { name: 'Academic Potential', weight: 30 },
      { name: 'Leadership & Community', weight: 30 },
      { name: 'Personal Story (Resilience)', weight: 40 },
    ],
    components: [
      { type: 'essay', label: 'Personal Statement (500 words)', icon: FileText },
      { type: 'ref', label: '2 Reference Letters', icon: Users },
      { type: 'transcript', label: 'Official Transcript', icon: GraduationCap },
    ],
    fitAnalysis: {
      strengths: [
        'Your GPA (3.8) exceeds the minimum requirement.',
        'You are a first-generation student in Computer Science.',
        'Your debate club leadership aligns with "Community Impact".',
      ],
      gaps: [
        'Ensure you emphasize your financial need in the essay.',
        'Highlight specific examples of "Innovation" in your projects.',
      ],
    },
  }

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

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          {/* Left Column */}
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                {scholarship.name}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {scholarship.provider}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {scholarship.amount}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {scholarship.frequency}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Deadline: {scholarship.deadline}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {scholarship.daysLeft}
                  </span>
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">About this scholarship</h2>
              <p className="leading-relaxed text-muted-foreground">
                {scholarship.description}
              </p>
              <Button variant="link" className="h-auto p-0 text-primary" asChild>
                <a href="#" target="_blank" rel="noopener noreferrer">
                  View official page <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Eligibility</h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {scholarship.eligibility.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Right Column (Sticky) */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">What they care about</CardTitle>
                <CardDescription>
                  Key themes and rubric weights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {scholarship.themes.map((theme) => (
                    <Badge
                      key={theme}
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {theme}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-3">
                  {scholarship.rubric.map((criterion) => (
                    <div key={criterion.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{criterion.name}</span>
                        <span className="text-muted-foreground">
                          {criterion.weight}%
                        </span>
                      </div>
                      <Progress value={criterion.weight} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Application components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scholarship.components.map((comp, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <comp.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>{comp.label}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button className="w-full" size="lg" asChild>
                  <Link to="/essay/$id" params={{ id: scholarship.id }}>
                    Start Essay
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <div className="grid w-full grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full">
                    Plan
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="w-full">
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Why me?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Why this fits you</DialogTitle>
                        <DialogDescription>
                          Based on your profile and the scholarship criteria.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-green-600 dark:text-green-500">
                            Your Strengths
                          </h4>
                          <ul className="space-y-2 text-sm">
                            {scholarship.fitAnalysis.strengths.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-500">
                            Potential Gaps / Tips
                          </h4>
                          <ul className="space-y-2 text-sm">
                            {scholarship.fitAnalysis.gaps.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
