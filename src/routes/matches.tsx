import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Heart,
  Layers,
  List,
  Sparkles,
  X,
} from 'lucide-react'

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
  countryTags: string[]
  workload: string
  workloadLabel: 'Light' | 'Medium' | 'Heavy'
  matchScore: number
  status?: 'in-progress' | 'ready' | 'ineligible'
  whyMatch?: string
  winnerInsights?: boolean
}

type ApiMatchRow = {
  id: string
  name: string
  country?: string | null
  url?: string | null
  min_gpa?: number | null
  distance?: number | null
  dot_sim?: number
  fields?: string[] | null
  metadata?: Record<string, any> | null
  sponsor?: string | null
}

const FALLBACK_MATCHES: MatchCard[] = [
  {
    id: 'fallback-1',
    name: 'Loran Award (demo)',
    provider: 'Loran Scholars Foundation',
    amount: 'Up to $100,000',
    deadline: 'October 16, 2025',
    daysLeft: '',
    levelTags: ['High School', 'Undergrad'],
    fieldTags: ['Any'],
    demographicTags: ['None specified'],
    countryTags: ['Canada'],
    workload: 'Essays + Refs',
    workloadLabel: 'Heavy',
    matchScore: 70,
    whyMatch: 'Leadership and community impact',
    winnerInsights: true,
  },
  {
    id: 'fallback-2',
    name: 'RBC Future Launch - Indigenous Youth (demo)',
    provider: 'Royal Bank of Canada',
    amount: '$10,000 / year',
    deadline: 'February 5, 2025',
    daysLeft: '',
    levelTags: ['Undergrad'],
    fieldTags: ['Any'],
    demographicTags: ['Indigenous identity'],
    countryTags: ['Canada'],
    workload: 'Essays + Refs',
    workloadLabel: 'Medium',
    matchScore: 68,
    whyMatch: 'Community leadership and need-based support',
    winnerInsights: true,
  },
]

type Mode = 'swipe' | 'list' | 'browse'

function MatchesPage() {
  const [matches, setMatches] = React.useState<MatchCard[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [browseAll, setBrowseAll] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<'score' | 'name'>('score')
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>([])
  const [fieldQuery, setFieldQuery] = React.useState('')
  const [hideIneligible, setHideIneligible] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<Mode>('swipe')
  const [savedMatches, setSavedMatches] = React.useState<Set<string>>(new Set())
  const [hiddenMatches, setHiddenMatches] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('saved_matches')
      if (saved) setSavedMatches(new Set(JSON.parse(saved)))
      const hidden = localStorage.getItem('hidden_matches')
      if (hidden) setHiddenMatches(new Set(JSON.parse(hidden)))
    } catch (e) {
      console.error('Failed to hydrate saved/hidden matches', e)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const stored =
          localStorage.getItem('scholarship_profile') || localStorage.getItem('profile')
        const parsedProfile = stored ? JSON.parse(stored) : null
        const studentId =
          localStorage.getItem('scholarship_student_id') || localStorage.getItem('student_id')

        let endpoint = '/api/match'
        let body: any = {}

        if (browseAll) {
          endpoint = '/api/retrieve'
          body = {
            student_summary: 'Browse all scholarships for this demo profile.',
            k: 60,
            ...(studentId ? { student_id: studentId } : {}),
          }
        } else {
          const studentSummary = parsedProfile?.summary
          if (!studentSummary) {
            setMatches([])
            setError('No saved profile found. Complete onboarding to see personalized matches.')
            return
          }
          const { minGpa, eligibility } = buildEligibility(parsedProfile)
          body = {
            student_summary: studentSummary,
            k: 30,
            ...(studentId ? { student_id: studentId } : {}),
            ...(minGpa !== undefined ? { min_gpa: minGpa } : {}),
            ...(eligibility ? { eligibility } : {}),
          }
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || `Request failed (${res.status})`)
        }
        const rows: ApiMatchRow[] = data.rows || []
        setMatches(rows.map((row, index) => toMatchCard(row, index, parsedProfile)))
      } catch (e: any) {
        console.error(e)
        setError(String(e?.message || e))
        setMatches(FALLBACK_MATCHES)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [browseAll])

  const toggleSave = (id: string) => {
    setSavedMatches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (typeof window !== 'undefined') {
        localStorage.setItem('saved_matches', JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  const hideMatch = (id: string) => {
    setHiddenMatches((prev) => {
      const next = new Set(prev)
      next.add(id)
      if (typeof window !== 'undefined') {
        localStorage.setItem('hidden_matches', JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  const removeSaved = (id: string) => {
    setSavedMatches((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    hideMatch(id)
  }

  const onToggleCountry = (country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country],
    )
  }

  const onToggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    )
  }

  const visibleMatches = React.useMemo(() => {
    const active = matches.filter((m) => !hiddenMatches.has(m.id))
    return active
      .filter((m) => {
        if (hideIneligible && m.status === 'ineligible') return false
        if (selectedCountries.length && !m.countryTags.some((c) => selectedCountries.includes(c)))
          return false
        if (
          selectedLevels.length &&
          !m.levelTags.some((l) =>
            selectedLevels.some((sel) => l.toLowerCase().includes(sel.toLowerCase())),
          )
        )
          return false
        if (
          fieldQuery.trim() &&
          !m.fieldTags.some((f) => f.toLowerCase().includes(fieldQuery.toLowerCase()))
        )
          return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        return b.matchScore - a.matchScore
      })
  }, [matches, hiddenMatches, hideIneligible, selectedCountries, selectedLevels, fieldQuery, sortBy])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/10 pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
            <p className="text-muted-foreground">
              Uses your saved profile and embeddings. Semantically ranked by fit.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="border-dashed">
              Profile-based
            </Badge>
            <Badge variant="outline" className="border-dashed">
              Embeddings ranked
            </Badge>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
              <BadgeCheck className="h-4 w-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'swipe' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('swipe')
              setBrowseAll(false)
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Find My Match
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('list')
              setBrowseAll(false)
            }}
          >
            <List className="mr-2 h-4 w-4" />
            See my matches
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'browse' ? 'default' : 'outline'}
            onClick={() => {
              setViewMode('browse')
              setBrowseAll(true)
            }}
          >
            <Layers className="mr-2 h-4 w-4" />
            Browse all
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Best match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Best match</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={hideIneligible}
              onCheckedChange={(v) => setHideIneligible(Boolean(v))}
            />
            <span>Hide ineligible</span>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden w-full rounded-lg border bg-card p-4 lg:block lg:w-72">
            <FiltersContent
              selectedCountries={selectedCountries}
              selectedLevels={selectedLevels}
              fieldQuery={fieldQuery}
              hideIneligible={hideIneligible}
              onToggleCountry={onToggleCountry}
              onToggleLevel={onToggleLevel}
              onFieldQuery={setFieldQuery}
              onToggleHideIneligible={setHideIneligible}
            />
          </aside>

          <div className="flex-1 space-y-4">
            {viewMode === 'swipe' && (
              <SwipeDeck
                matches={visibleMatches}
                onSave={toggleSave}
                onSkip={hideMatch}
                savedIds={savedMatches}
                loading={loading}
              />
            )}
            {viewMode === 'list' && (
              <ListView
                matches={visibleMatches.filter((m) => savedMatches.has(m.id))}
                loading={loading}
                onRemove={removeSaved}
              />
            )}
            {viewMode === 'browse' && (
              <BrowseView
                matches={visibleMatches}
                loading={loading}
                onSave={toggleSave}
                savedIds={savedMatches}
              />
            )}
            {!loading && visibleMatches.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No matches under these filters yet. Try widening filters or browse all.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SwipeDeck({
  matches,
  onSave,
  onSkip,
  savedIds,
  loading,
}: {
  matches: MatchCard[]
  onSave: (id: string) => void
  onSkip: (id: string) => void
  savedIds: Set<string>
  loading?: boolean
}) {
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => setIndex(0), [matches])
  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (!matches.length) return null
  const current = matches[index]
  const progress = `${index + 1} of ${matches.length} matches`
  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Find My Match</CardTitle>
            <CardDescription>
              Swipe through AI-ranked matches. Saved scholarships appear in your Dashboard and Planner.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[11px]">
            Semantically ranked
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <SwipeCard match={current} />
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <div className="flex w-full flex-wrap gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => {
              onSkip(current.id)
              setIndex((i) => Math.min(i + 1, matches.length - 1))
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onSave(current.id)
              setIndex((i) => Math.min(i + 1, matches.length - 1))
            }}
          >
            <Heart className="mr-2 h-4 w-4" />
            {savedIds.has(current.id) ? 'Saved' : 'Save'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {progress} | Your choices help re-rank future recommendations.
        </p>
      </CardFooter>
    </Card>
  )
}

function SwipeCard({ match }: { match: MatchCard }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{match.amount}</Badge>
        <Badge variant="outline">
          <CalendarDays className="mr-1 h-3 w-3" />
          {match.deadline}
        </Badge>
        <Badge variant="secondary">{match.workload}</Badge>
        {match.countryTags?.[0] && <Badge variant="outline">{match.countryTags[0]}</Badge>}
        {match.winnerInsights ? (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Winner insights available
          </Badge>
        ) : null}
      </div>
      <div>
        <h3 className="text-xl font-semibold">{match.name}</h3>
        <p className="text-sm text-muted-foreground">{match.provider}</p>
      </div>
      <div className="text-sm text-muted-foreground">
        Requires: {match.workload} | Match: {match.matchScore} ({matchTier(match.matchScore)}){' '}
        {match.whyMatch ? `- ${match.whyMatch}` : ''}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {match.fieldTags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
        {match.demographicTags.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function ListView({
  matches,
  loading,
  onRemove,
}: {
  matches: MatchCard[]
  loading?: boolean
  onRemove: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved & Active Matches</CardTitle>
        <CardDescription>Manage scholarships you have saved or are working on.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved matches yet.</p>
        ) : (
          matches.map((m) => (
            <div key={m.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{m.name}</p>
                    <Badge variant="secondary" className="text-[11px]">
                      {m.matchScore}% fit
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.provider}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onRemove(m.id)}>
                    Remove
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/scholarship/${m.id}`}>
                      Open
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline">{m.amount}</Badge>
                <Badge variant="outline">{m.deadline}</Badge>
                <Badge variant="secondary">{m.workload}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function BrowseView({
  matches,
  loading,
  onSave,
  savedIds,
}: {
  matches: MatchCard[]
  loading?: boolean
  onSave: (id: string) => void
  savedIds: Set<string>
}) {
  return (
    <div className="space-y-4">
      {loading
        ? Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="h-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-4 w-36" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
              <CardFooter className="gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </CardFooter>
            </Card>
          ))
        : matches.map((match) => (
            <MatchCardFull
              key={match.id}
              match={match}
              onSave={() => onSave(match.id)}
              saved={savedIds.has(match.id)}
            />
          ))}
    </div>
  )
}

function FiltersContent({
  selectedCountries,
  selectedLevels,
  fieldQuery,
  hideIneligible,
  onToggleCountry,
  onToggleLevel,
  onFieldQuery,
  onToggleHideIneligible,
}: {
  selectedCountries: string[]
  selectedLevels: string[]
  fieldQuery: string
  hideIneligible: boolean
  onToggleCountry: (value: string) => void
  onToggleLevel: (value: string) => void
  onFieldQuery: (value: string) => void
  onToggleHideIneligible: (value: boolean) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Country / Region</p>
        <div className="space-y-1">
          {['Canada', 'United States', 'United Kingdom', 'Australia'].map((label) => {
            const checked = selectedCountries.includes(label)
            return (
              <div key={label} className="flex items-center space-x-2">
                <Checkbox
                  id={`country-${label}`}
                  checked={checked}
                  onCheckedChange={() => onToggleCountry(label)}
                />
                <label
                  htmlFor={`country-${label}`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {label}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Level of Study</p>
        <div className="space-y-1">
          {['High School', 'Undergrad', 'Graduate', 'Any'].map((label) => {
            const checked = selectedLevels.includes(label)
            return (
              <div key={label} className="flex items-center space-x-2">
                <Checkbox
                  id={`level-${label}`}
                  checked={checked}
                  onCheckedChange={() => onToggleLevel(label)}
                />
                <label
                  htmlFor={`level-${label}`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {label}
                </label>
              </div>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Fields of Study</label>
        <Input
          placeholder="Search fields..."
          className="h-9"
          value={fieldQuery}
          onChange={(e) => onFieldQuery(e.target.value)}
        />
      </div>
      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground">Workload</label>
        <div className="flex flex-wrap gap-2">
          {['All', 'Light', 'Medium', 'Heavy'].map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="cursor-pointer"
              onClick={() => onFieldQuery(label === 'All' ? '' : label)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ineligible"
            checked={hideIneligible}
            onCheckedChange={(v) => onToggleHideIneligible(Boolean(v))}
          />
          <label
            htmlFor="ineligible"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Hide ineligible
          </label>
        </div>
      </div>
    </div>
  )
}

function MatchCardFull({
  match,
  onSave,
  saved,
}: {
  match: MatchCard
  onSave: () => void
  saved: boolean
}) {
  const href = `/scholarship/${match.id}`
  const tagBadges = React.useMemo(() => {
    const annotated = [
      ...(match.countryTags || []).map((t) => ({ label: t, kind: 'country' as const })),
      ...(match.levelTags || []).map((t) => ({ label: t, kind: 'level' as const })),
      ...(match.fieldTags || []).map((t) => ({ label: t, kind: 'field' as const })),
      ...(match.demographicTags || []).map((t) => ({ label: t, kind: 'demo' as const })),
    ].filter((t) => t.label)
    const unique = []
    const seen = new Set<string>()
    for (const item of annotated) {
      if (seen.has(item.label)) continue
      seen.add(item.label)
      unique.push(item)
    }
    const max = 6
    return {
      display: unique.slice(0, max),
      overflow: unique.length > max ? unique.length - max : 0,
    }
  }, [match.countryTags, match.levelTags, match.fieldTags, match.demographicTags])
  return (
    <Card
      className="h-full cursor-pointer transition hover:shadow-lg"
      onClick={() => (window.location.href = href)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{match.name}</CardTitle>
            <CardDescription className="text-sm">{match.provider}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] rounded-full border-muted-foreground/40 text-foreground"
            >
              Match score: {match.matchScore}
            </Badge>
            <Button
              size="icon"
              variant={saved ? 'secondary' : 'outline'}
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onSave()
              }}
            >
              <Heart className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center justify-between text-base font-semibold text-foreground">
          <span className="text-primary">{match.amount}</span>
          <span className="text-sm text-muted-foreground">Deadline: {match.deadline}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[12px]">
          {tagBadges.display.map((t) => {
            const isCountry = t.kind === 'country'
            const isNeutral = t.label.toLowerCase() === 'any'
            return (
              <Badge
                key={t.label}
                variant={isCountry ? 'outline' : 'secondary'}
                className={
                  isCountry
                    ? 'border-primary/40 text-primary'
                    : isNeutral
                      ? 'bg-muted text-foreground'
                      : 'bg-amber-500 text-foreground hover:bg-amber-600'
                }
              >
                {t.label}
              </Badge>
            )
          })}
          {tagBadges.overflow > 0 && (
            <Badge variant="secondary" className="bg-muted text-foreground">
              +{tagBadges.overflow} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 border-t bg-muted/30">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {match.workloadLabel} Workload: {match.workload || 'Short form'}
        </span>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            window.location.href = href
          }}
        >
          View Details <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function matchTier(score: number) {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Okay'
  return 'Unknown'
}

function toMatchCard(row: ApiMatchRow, fallbackIndex: number, profile: any): MatchCard {
  const workloadMeta = computeWorkload(row)
  const eligibilityStatus = evaluateEligibility(row, profile)
  const baseScore = computeMatchScore(row, fallbackIndex)
  const adjustedScore = adjustScoreForEligibility(baseScore, eligibilityStatus)
  return {
    id: String(row.id),
    name: row.name,
    provider: row.metadata?.provider_name || row.sponsor || 'Scholarship Provider',
    amount: row.metadata?.amount_max
      ? `$${row.metadata.amount_max}`
      : row.metadata?.amount_min
        ? `$${row.metadata.amount_min}`
        : 'Varies',
    deadline: row.metadata?.deadline ? new Date(row.metadata.deadline).toLocaleDateString() : 'Open',
    daysLeft: '',
    levelTags: formatTags(extractArray(row.metadata?.level_of_study)),
    fieldTags: formatTags(extractFields(row)),
    demographicTags: formatTags(
      (row.metadata?.demographic_eligibility as string[] | undefined)?.filter(
        (tag) => tag && tag !== 'none_specified',
      ) ?? [],
    ),
    countryTags: formatTags(extractCountries(row)),
    workload: workloadMeta.text,
    workloadLabel: workloadMeta.label,
    matchScore: adjustedScore,
    status: eligibilityStatus.status === 'ineligible' ? 'ineligible' : undefined,
    whyMatch: row.metadata?.why_fit || row.metadata?.why_match || 'Highlights your profile fit.',
    winnerInsights: Boolean(row.metadata?.winner_patterns),
  }
}

function buildEligibility(profile: any) {
  const minGpa = profile?.gpa ? Number(profile.gpa) : undefined
  const eligibility: any = {}
  if (profile?.country) eligibility.country = profile.country
  if (profile?.citizenship) eligibility.citizenship = profile.citizenship
  if (profile?.backgroundTags) eligibility.demographic = profile.backgroundTags
  if (profile?.identityTags) eligibility.demographic = [
    ...(eligibility.demographic || []),
    ...profile.identityTags,
  ]
  return { minGpa, eligibility }
}

function extractFields(row: ApiMatchRow) {
  const fields = Array.isArray(row.fields) ? row.fields : []
  const metaFields = Array.isArray(row.metadata?.fields_of_study) ? row.metadata?.fields_of_study : []
  return [...fields, ...(metaFields || [])]
}

function extractArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }
  return []
}

function extractCountries(row: ApiMatchRow) {
  const metadata = row.metadata || {}
  const countries =
    extractArray(metadata.country_eligibility) ||
    extractArray((metadata as any).countryEligibility) ||
    extractArray((metadata as any).countries)
  if (row.country) countries.push(row.country)
  return countries.map((c) => (c.length === 2 ? c.toUpperCase() : c))
}

function formatTags(tags: string[]) {
  if (!tags.length) return ['Any']
  return tags.map((t) => t.replace(/_/g, ' '))
}

function computeWorkload(row: ApiMatchRow) {
  const meta = row.metadata || {}
  const components = meta.application_components || {}
  let label: 'Light' | 'Medium' | 'Heavy' = 'Light'
  let score = 0
  const essays = Number(components.essays ?? 0)
  const refs = Number(components.reference_letters ?? 0)
  if (essays) score += essays * 2
  if (refs) score += refs
  if (components.transcript_required) score += 1
  if (components.resume_required) score += 1
  if (components.portfolio_required) score += 2
  if (components.interview_possible) score += 2
  if (score >= 5) label = 'Heavy'
  else if (score >= 3) label = 'Medium'
  const text = `${essays || 0} essay(s)${refs ? ` + ${refs} rec(s)` : ''}`
  return { text, label }
}

function normalizeValue(value?: string | null) {
  return value ? value.trim().toLowerCase() : ''
}

function normalizeCountry(value?: string | null) {
  const v = normalizeValue(value)
  const map: Record<string, string> = {
    us: 'us',
    usa: 'us',
    'united states': 'us',
    united_states: 'us',
    ca: 'ca',
    canada: 'ca',
    uk: 'uk',
    'united kingdom': 'uk',
    gb: 'uk',
    australia: 'au',
    au: 'au',
  }
  return map[v] || v
}

function evaluateEligibility(row: ApiMatchRow, profile?: any) {
  let ineligible = false
  const reasons: string[] = []
  if (!profile) return { status: 'eligible' as const, reasons }

  const profileCountry = normalizeCountry(profile.country)
  const profileCitizenship = normalizeValue(profile.citizenship)
  const profileGpa = profile.gpa ? Number(profile.gpa) : undefined
  const genderTag = profile.gender ? normalizeValue(profile.gender) : ''
  const profileTags: string[] = [
    ...(Array.isArray(profile.backgroundTags) ? profile.backgroundTags : []),
    ...(Array.isArray(profile.identityTags) ? profile.identityTags : []),
    genderTag,
  ].map(normalizeValue).filter(Boolean)

  const countryEligibility = extractArray(row.metadata?.country_eligibility).map(normalizeCountry)
  const scholarshipCountry = normalizeCountry(row.country || (row.metadata as any)?.source_country)
  if (profileCountry) {
    if (countryEligibility.length && !countryEligibility.includes(profileCountry)) {
      ineligible = true
      reasons.push('Country not in eligibility list')
    } else if (scholarshipCountry && scholarshipCountry !== profileCountry) {
      reasons.push('Different country focus')
    }
  }

  if (typeof row.min_gpa === 'number' && profileGpa !== undefined && profileGpa < row.min_gpa) {
    ineligible = true
    reasons.push('GPA below minimum')
  }

  const citizenshipReq = extractArray((row.metadata as any)?.citizenship_requirements).map(
    normalizeValue,
  )
  if (profileCitizenship && citizenshipReq.length && !citizenshipReq.includes(profileCitizenship)) {
    ineligible = true
    reasons.push('Citizenship requirement not met')
  }

  const demographicReq = extractArray((row.metadata as any)?.demographic_eligibility)
    .map(normalizeValue)
    .filter((t) => t && t !== 'none_specified')
  if (demographicReq.length) {
    if (!profileTags.length) {
      ineligible = true
      reasons.push('Demographic requirement not met (no demographic info)')
    } else {
      const overlap = demographicReq.some((t) => profileTags.includes(t))
      if (!overlap) {
        ineligible = true
        reasons.push('Demographic requirement not met')
      }
    }
  }

  return {
    status: ineligible ? ('ineligible' as const) : ('eligible' as const),
    reasons,
  }
}

function adjustScoreForEligibility(score: number, eligibility: { status: string }) {
  if (eligibility.status === 'ineligible') return 0
  return score
}

function computeMatchScore(row: ApiMatchRow, fallbackIndex: number) {
  if (typeof row.dot_sim === 'number') {
    const sim = Math.max(-1, Math.min(1, row.dot_sim))
    const score = Math.round(((sim + 1) / 2) * 100)
    return Math.max(0, Math.min(100, score))
  }
  if (typeof row.distance === 'number') {
    const d = Math.min(Math.max(row.distance, 0), 2)
    const score = Math.round((1 - d / 2) * 100)
    return Math.max(0, Math.min(100, score))
  }
  return Math.max(0, Math.min(100, 70 - fallbackIndex))
}

export default MatchesPage
