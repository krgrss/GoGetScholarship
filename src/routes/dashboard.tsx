import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  // Mock Data
  const kpiData = [
    {
      title: 'Total Applications',
      value: '12',
      change: '+2 this week',
      icon: FileText,
    },
    {
      title: 'In Progress',
      value: '5',
      change: '3 due soon',
      icon: Clock,
    },
    {
      title: 'Completed',
      value: '7',
      change: '4 submitted',
      icon: CheckCircle2,
    },
    {
      title: 'Potential Value',
      value: '$45k',
      change: 'Top 10% matches',
      icon: TrendingUp,
    },
  ]

  const applications = [
    {
      id: '1',
      name: 'First-Gen STEM Innovators Scholarship',
      provider: 'Aurora Foundation',
      deadline: 'Jan 15, 2026',
      status: 'In Progress',
      progress: 65,
      readiness: 'High',
      nextAction: 'Draft Essay',
    },
    {
      id: '2',
      name: 'Global Future Leaders Grant',
      provider: 'World Education Trust',
      deadline: 'Feb 01, 2026',
      status: 'Not Started',
      progress: 0,
      readiness: 'Medium',
      nextAction: 'Review Requirements',
    },
    {
      id: '3',
      name: 'Women in Tech Scholarship',
      provider: 'TechForward',
      deadline: 'Dec 20, 2025',
      status: 'Submitted',
      progress: 100,
      readiness: 'Complete',
      nextAction: 'Wait for Decision',
    },
    {
      id: '4',
      name: 'Community Impact Award',
      provider: 'Local Civic Group',
      deadline: 'Jan 10, 2026',
      status: 'In Progress',
      progress: 30,
      readiness: 'Low',
      nextAction: 'Request References',
    },
  ]

  const suggestions = [
    {
      id: 's1',
      name: 'Engineering Excellence Award',
      reason: 'Reuses 80% of your "STEM Innovators" essay.',
      effort: 'Low Effort',
    },
    {
      id: 's2',
      name: 'Future Builders Grant',
      reason: 'Same reference letters required.',
      effort: 'Quick Apply',
    },
  ]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-muted/10 pb-12">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your applications and find new opportunities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/matches">
                <Plus className="mr-2 h-4 w-4" />
                Find Scholarships
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* Main Content - Applications List */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Applications</CardTitle>
                <CardDescription>
                  Manage your ongoing scholarship applications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search applications..."
                      className="pl-8"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Filter</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>In Progress</DropdownMenuItem>
                      <DropdownMenuItem>Submitted</DropdownMenuItem>
                      <DropdownMenuItem>Not Started</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scholarship</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <div className="font-medium">{app.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Due: {app.deadline}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              app.status === 'Submitted'
                                ? 'secondary'
                                : app.status === 'In Progress'
                                  ? 'default'
                                  : 'outline'
                            }
                            className={
                                app.status === 'Submitted'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : ''
                            }
                          >
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={app.progress} className="w-[60px]" />
                            <span className="text-xs text-muted-foreground">
                              {app.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <Link to="/scholarship/$id" params={{ id: app.id }}>
                              <ArrowRight className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Suggestions */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Low Extra Work
                </CardTitle>
                <CardDescription>
                  Scholarships you can apply to with minimal effort.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="rounded-lg border bg-background p-3 shadow-sm"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h4 className="font-semibold leading-tight">
                        {suggestion.name}
                      </h4>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {suggestion.effort}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.reason}
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 h-auto p-0 text-xs text-indigo-600 dark:text-indigo-400"
                    >
                      View Details <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Women in Tech Scholarship
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due in 2 days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
