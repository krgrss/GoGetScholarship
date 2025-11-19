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

const MOCK_MATCHES: MatchCard[] = [
  {
    id: '1',
    name: 'First-Gen STEM Innovators Scholarship',
    provider: 'Aurora Foundation',
    amount: 'Up to CAD 12,000',
    deadline: 'Jan 15, 2026',
    daysLeft: '45 days left',
    levelTags: ['Undergraduate'],
    fieldTags: ['STEM', 'Engineering'],
    demographicTags: ['First-generation priority'],
    workload: '1 essay • 2 refs • transcript',
    workloadLabel: 'Heavy',
    matchScore: 95,
    status: 'in-progress',
  },
  {
    id: '2',
    name: 'Community Impact Leaders Grant',
    provider: 'Northbridge Trust',
    amount: 'USD 5,000',
    deadline: 'Dec 20, 2025',
    daysLeft: '12 days left',
    levelTags: ['Undergraduate', 'Graduate'],
    fieldTags: ['Social impact'],
    demographicTags: [],
    workload: 'Short essay • 1 ref',
    workloadLabel: 'Medium',
    matchScore: 88,
    status: 'ready',
  },
  {
    id: '3',
    name: 'Women in Computing Fellowship',
    provider: 'Lambda Labs',
    amount: 'USD 18,000',
    deadline: 'Feb 10, 2026',
    daysLeft: '70 days left',
    levelTags: ['Graduate', 'PhD'],
    fieldTags: ['Computer Science'],
    demographicTags: ['Women in STEM'],
    workload: 'Research proposal • 3 refs',
    workloadLabel: 'Heavy',
    matchScore: 92,
  },
  {
    id: '4',
    name: 'Global Citizens Study Abroad Award',
    provider: 'Wayfarer Scholars',
    amount: 'USD 7,500',
    deadline: 'Mar 01, 2026',
    daysLeft: '90 days left',
    levelTags: ['Undergraduate'],
    fieldTags: ['Any field'],
    demographicTags: [],
    workload: 'Video intro • Transcript',
    workloadLabel: 'Light',
    matchScore: 80,
  },
]

function MatchesPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Your scholarship matches
            </h1>
            <p className="text-sm text-muted-foreground">
              Based on your profile. We found {MOCK_MATCHES.length} opportunities for you.
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

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <FiltersContent />
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-4">
            {MOCK_MATCHES.map((match) => (
              <Card
                key={match.id}
                className="group transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg leading-tight">
                          {match.name}
                        </CardTitle>
                        {match.status === 'in-progress' && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            In Progress
                          </Badge>
                        )}
                        {match.status === 'ready' && (
                          <Badge className="h-5 bg-green-500/15 text-[10px] text-green-700 hover:bg-green-500/25 dark:text-green-400">
                            Ready to submit
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{match.provider}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">{match.amount}</div>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>{match.deadline}</span>
                      </div>
                    </div>
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
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      match.workloadLabel === 'Light' ? 'bg-green-500' :
                      match.workloadLabel === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">{match.workloadLabel} Workload:</span>
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
        </div>
      </main>
    </div>
  )
}

function FiltersContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Country / Region
        </label>
        <Select defaultValue="any">
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="ca">Canada</SelectItem>
            <SelectItem value="us">United States</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Level of Study
        </label>
        <Select defaultValue="any">
          <SelectTrigger>
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="ug">Undergraduate</SelectItem>
            <SelectItem value="grad">Graduate</SelectItem>
          </SelectContent>
        </Select>
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
