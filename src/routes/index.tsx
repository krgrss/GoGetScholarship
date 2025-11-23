import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, FileEdit, Search, User } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [hasProfile, setHasProfile] = React.useState(false)

  React.useEffect(() => {
    // Simple check for demo purposes
    const profile = localStorage.getItem('scholarship_profile')
    if (profile) {
      setHasProfile(true)
    }
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:py-24">
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Scholarship Application Studio</span>
          </div>
          <h1 className="mb-6 font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Stop searching. <br className="hidden sm:block" />
            Start <span className="text-primary">winning</span>.
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            GoGetScholarship finds high-fit opportunities, explains exactly what they want, and helps you draft winning essays in minutes.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link to={hasProfile ? '/matches' : '/onboarding'}>
                {hasProfile ? 'View Your Matches' : 'Start with your Profile'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link to="/profile">Go to Profile</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Follow the core flow: <strong>Profile → Matches → Scholarship → Draft & Grade</strong>. Start with your profile to unlock personalized matches, then open a scholarship to view details and draft.
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StepCard
              icon={<User className="h-6 w-6 text-blue-500" />}
              title="1. Profile"
              description="Tell us about your background, grades, and interests."
              active={!hasProfile}
            />
            <StepCard
              icon={<Search className="h-6 w-6 text-amber-500" />}
              title="2. Matches"
              description="Get a curated list of scholarships you can actually win."
              active={hasProfile}
            />
            <StepCard
              icon={<BookOpen className="h-6 w-6 text-green-500" />}
              title="3. Detail"
              description="Open a scholarship, see rubric, and what the sponsor cares about."
            />
            <StepCard
              icon={<FileEdit className="h-6 w-6 text-purple-500" />}
              title="4. Draft & Grade"
              description="Use AI to draft, grade, and refine your essays with feedback."
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: 'Step 1',
              title: 'Create your profile',
              description:
                'Fill onboarding with academics, activities, and background so we can match you.',
              cta: hasProfile ? { label: 'View profile', to: '/profile' } : { label: 'Start now', to: '/onboarding' },
            },
            {
              step: 'Step 2',
              title: 'Get your matches',
              description:
                'See eligible scholarships and open one to review requirements and rubric.',
              cta: { label: 'Go to matches', to: '/matches' },
            },
            {
              step: 'Step 3',
              title: 'Draft & grade',
              description:
                'Generate a tailored essay, grade it, and iterate until ready to submit.',
              cta: { label: 'Open a scholarship', to: '/matches' },
            },
          ].map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader className="space-y-2">
                <div className="text-xs font-semibold uppercase text-primary">{item.step}</div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-between space-y-4">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div>
                  <Button size="sm" asChild>
                    <Link to={item.cta.to}>{item.cta.label}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {hasProfile && (
          <section className="mx-auto max-w-md rounded-2xl bg-muted/50 p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              You have a profile saved. Ready to continue?
            </p>
            <Button variant="secondary" asChild>
              <Link to="/matches">Go to Matches</Link>
            </Button>
          </section>
        )}
      </main>
    </div>
  )
}

function StepCard({
  icon,
  title,
  description,
  active = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  active?: boolean
}) {
  return (
    <Card className={`transition-all ${active ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}>
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
