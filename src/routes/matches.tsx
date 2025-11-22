import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/matches')({
  component: MatchesPage,
})

type MatchCard = {
  id: string
  name: string
  provider: string
  amount: string
  deadline: string
  daysLeft: string
  levelTags: string[]
  fieldTags: string[]
  demographicTags: string[]
  workload: string
  workloadLabel: 'Light' | 'Medium' | 'Heavy'
  matchScore: number
  status?: 'in-progress' | 'ready'
}

function MatchesPage() {
  const [matches, setMatches] = React.useState<MatchCard[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [browseAll, setBrowseAll] = React.useState(true)
  const [sortBy, setSortBy] = React.useState<'score' | 'name'>('score')

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const stored = localStorage.getItem('scholarship_profile')
        const profile = stored ? JSON.parse(stored) : null
        let studentSummary: string | null = null
        let endpoint = '/api/match'
        let body: any = {}

        if (browseAll) {
          studentSummary = 'Browse all scholarships for this demo profile.'
          endpoint = '/api/retrieve'
          body = {
            student_summary: studentSummary,
            k: 50,
          }
        } else {
          studentSummary = profile?.summary ?? null
          if (!studentSummary) {
            setMatches([])
            setError(
              'No saved profile found. Complete the onboarding flow to see personalized matches.',
            )
            return
          }
          endpoint = '/api/match'
          body = {
            student_summary: studentSummary,
            k: 20,
          }
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || `Request failed (${res.status})`)
        }

        const rows: {
          id: string
          name: string
          url?: string | null
          min_gpa?: number | null
          distance?: number
          dot_sim?: number
        }[] = data.rows || []

        const next: MatchCard[] = rows.map((row, index) => ({
          id: String(row.id),
          name: row.name,
          provider: 'Scholarship provider',
          amount: 'See details',
          deadline: 'See details',
          daysLeft: '',
          levelTags: [],
          fieldTags: [],
          demographicTags: [],
          workload: 'See components',
          workloadLabel: 'Medium',
          matchScore:
            typeof row.dot_sim === 'number'
              ? Math.round(row.dot_sim * 100)
              : 70 - index,
        }))

        setMatches(next)
      } catch (e: any) {
        setError(String(e.message || e))
        setMatches([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [browseAll])

  const visibleMatches = React.useMemo(() => {
    const base = [...matches]
    if (sortBy === 'score') {
      return base.sort((a, b) => b.matchScore - a.matchScore)
    }
    return base.sort((a, b) => a.name.localeCompare(b.name))
  }, [matches, sortBy])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {browseAll ? 'Browse scholarships' : 'Your scholarship matches'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {browseAll
                ? 'Showing a broad set of scholarships. Use filters to narrow down.'
                : 'Based on your profile and embeddings. We ranked scholarships by semantic fit.'}
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left column: filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </CardTitle>
                <CardDescription className="text-xs">
                  Start broad, then narrow to the best fits.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FiltersContent />
              </CardContent>
            </Card>
          </aside>

          {/* Right column: matches */}
          <section className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <section className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 ring-1 ring-border">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Uses your saved profile and embeddings
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 ring-1 ring-border">
                  <CalendarDays className="h-3 w-3" />
                  Semantically ranked by fit
                </span>
              </section>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={browseAll ? 'outline' : 'default'}
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={() => setBrowseAll(false)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  See my matches
                </Button>
                <Button
                  variant={browseAll ? 'default' : 'outline'}
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={() => setBrowseAll(true)}
                >
                  <Filter className="h-4 w-4" />
                  Browse all scholarships
                </Button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Sort by</span>
                  <Select
                    value={sortBy}
                    onValueChange={(val) =>
                      setSortBy((val as 'score' | 'name') ?? 'score')
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Best match</SelectItem>
                      <SelectItem value="name">Name (A–Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {loading && (
                  <p className="text-xs text-muted-foreground">Loading matches…</p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive">
                {error}
              </p>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              {loading && visibleMatches.length === 0 && (
                <>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Card key={idx} className="flex h-full flex-col justify-between">
                      <CardHeader className="pb-3">
                        <Skeleton className="mb-2 h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-4 w-16 rounded-full" />
                          <Skeleton className="h-4 w-20 rounded-full" />
                          <Skeleton className="h-4 w-24 rounded-full" />
                        </div>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between border-t bg-muted/5 px-6 py-3">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-8 w-24 rounded-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </>
              )}

              {!loading && visibleMatches.map((match) => (
                <Card key={match.id} className="flex h-full flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{match.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {match.provider}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Match score: {match.matchScore}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex flex-wrap gap-2">
                      {match.demographicTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {match.fieldTags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {match.levelTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t bg-muted/5 px-6 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          match.workloadLabel === 'Light'
                            ? 'bg-green-500'
                            : match.workloadLabel === 'Medium'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium">
                        {match.workloadLabel} Workload:
                      </span>
                      <span>{match.workload}</span>
                    </div>
                    <Button size="sm" asChild>
                      <Link to="/scholarship/$id" params={{ id: match.id }}>
                        View Details
                        <ArrowRight className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}

function FiltersContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Country / Region
        </p>
        <div className="space-y-1">
          {['Canada', 'United States', 'United Kingdom', 'Australia'].map((label) => (
            <div key={label} className="flex items-center space-x-2">
              <Checkbox id={`country-${label}`} />
              <label
                htmlFor={`country-${label}`}
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Level of Study
        </p>
        <div className="space-y-1">
          {['High School', 'Undergraduate', 'Graduate', 'PhD'].map((label) => (
            <div key={label} className="flex items-center space-x-2">
              <Checkbox id={`level-${label}`} />
              <label
                htmlFor={`level-${label}`}
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Fields of Study
        </label>
        <Input placeholder="Search fields..." className="h-9" />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground">
          Workload
        </label>
        <div className="flex flex-wrap gap-2">
          {['All', 'Light', 'Medium', 'Heavy'].map((label) => (
            <Badge
              key={label}
              variant={label === 'All' ? 'default' : 'outline'}
              className="cursor-pointer"
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="priority" />
          <label
            htmlFor="priority"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Priority matches only
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="ineligible" defaultChecked />
          <label
            htmlFor="ineligible"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Hide ineligible
          </label>
        </div>
      </div>

      <Button variant="outline" className="w-full" size="sm">
        Reset Filters
      </Button>
    </div>
  )
}
