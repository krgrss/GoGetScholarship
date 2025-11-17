// import { createFileRoute } from '@tanstack/react-router'
// import {
//   Zap,
//   Server,
//   Route as RouteIcon,
//   Shield,
//   Waves,
//   Sparkles,
// } from 'lucide-react'

// export const Route = createFileRoute('/')({ component: App })

// function App() {
//   const features = [
//     {
//       icon: <Zap className="w-12 h-12 text-cyan-400" />,
//       title: 'Powerful Server Functions',
//       description:
//         'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
//     },
//     {
//       icon: <Server className="w-12 h-12 text-cyan-400" />,
//       title: 'Flexible Server Side Rendering',
//       description:
//         'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
//     },
//     {
//       icon: <RouteIcon className="w-12 h-12 text-cyan-400" />,
//       title: 'API Routes',
//       description:
//         'Build type-safe API endpoints alongside your application. No separate backend needed.',
//     },
//     {
//       icon: <Shield className="w-12 h-12 text-cyan-400" />,
//       title: 'Strongly Typed Everything',
//       description:
//         'End-to-end type safety from server to client. Catch errors before they reach production.',
//     },
//     {
//       icon: <Waves className="w-12 h-12 text-cyan-400" />,
//       title: 'Full Streaming Support',
//       description:
//         'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
//     },
//     {
//       icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
//       title: 'Next Generation Ready',
//       description:
//         'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
//     },
//   ]

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
//       <section className="relative py-20 px-6 text-center overflow-hidden">
//         <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
//         <div className="relative max-w-5xl mx-auto">
//           <div className="flex items-center justify-center gap-6 mb-6">
//             <img
//               src="/tanstack-circle-logo.png"
//               alt="TanStack Logo"
//               className="w-24 h-24 md:w-32 md:h-32"
//             />
//             <h1 className="text-6xl md:text-7xl font-black text-white [letter-spacing:-0.08em]">
//               <span className="text-gray-300">TANSTACK</span>{' '}
//               <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
//                 START
//               </span>
//             </h1>
//           </div>
//           <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
//             The framework for next generation AI applications
//           </p>
//           <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
//             Full-stack framework powered by TanStack Router for React and Solid.
//             Build modern applications with server functions, streaming, and type
//             safety.
//           </p>
//           <div className="flex flex-col items-center gap-4">
//             <a
//               href="https://tanstack.com/start"
//               target="_blank"
//               rel="noopener noreferrer"
//               className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
//             >
//               Documentation
//             </a>
//             <p className="text-gray-400 text-sm mt-2">
//               Begin your TanStack Start journey by editing{' '}
//               <code className="px-2 py-1 bg-slate-700 rounded text-cyan-400">
//                 /src/routes/index.tsx
//               </code>
//             </p>
//           </div>
//         </div>
//       </section>

//       <section className="py-16 px-6 max-w-7xl mx-auto">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {features.map((feature, index) => (
//             <div
//               key={index}
//               className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
//             >
//               <div className="mb-4">{feature.icon}</div>
//               <h3 className="text-xl font-semibold text-white mb-3">
//                 {feature.title}
//               </h3>
//               <p className="text-gray-400 leading-relaxed">
//                 {feature.description}
//               </p>
//             </div>
//           ))}
//         </div>
//       </section>
//     </div>
//   )
// }
// /**
//  * Landing page
//  * - Highlights TanStack Start features used by this app
//  * - Safe place to link to /profile for the Day 1 student form
//  */
import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, ArrowRight, CheckCircle2, Clock } from 'lucide-react'

type ScholarshipStatus = 'recommended' | 'in-progress' | 'applied'

type ScholarshipCard = {
  id: string
  name: string
  sponsor: string
  amount: string
  deadline: string
  matchLabel: string
  status: ScholarshipStatus
  nextStep: string
}

const MOCK_SCHOLARSHIPS: ScholarshipCard[] = [
  {
    id: '1',
    name: 'First-Gen STEM Innovators Scholarship',
    sponsor: 'Aurora Foundation',
    amount: '$12,000',
    deadline: 'Jan 15',
    matchLabel: 'Fit: Very high',
    status: 'recommended',
    nextStep: 'Review requirements and start a draft',
  },
  {
    id: '2',
    name: 'Community Impact Leaders Grant',
    sponsor: 'Northbridge Trust',
    amount: '$5,000',
    deadline: 'Dec 20',
    matchLabel: 'Fit: High',
    status: 'in-progress',
    nextStep: 'Finish the “impact story” paragraph',
  },
  {
    id: '3',
    name: 'Women in Computing Fellowship',
    sponsor: 'Lambda Labs',
    amount: '$18,000',
    deadline: 'Feb 10',
    matchLabel: 'Fit: Strong',
    status: 'recommended',
    nextStep: 'Skim the prompt and personalize your profile',
  },
  {
    id: '4',
    name: 'Global Citizens Study Abroad Award',
    sponsor: 'Wayfarer Scholars',
    amount: '$7,500',
    deadline: 'Closed',
    matchLabel: 'Applied',
    status: 'applied',
    nextStep: 'Track results and reuse this draft',
  },
]

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [health, setHealth] = React.useState<any>(null)
  const [db, setDb] = React.useState<any>(null)
  const [claude, setClaude] = React.useState<any>(null)

  const recommended = React.useMemo(
    () => MOCK_SCHOLARSHIPS.filter((s) => s.status === 'recommended'),
    []
  )
  const inProgress = React.useMemo(
    () => MOCK_SCHOLARSHIPS.filter((s) => s.status === 'in-progress'),
    []
  )
  const applied = React.useMemo(
    () => MOCK_SCHOLARSHIPS.filter((s) => s.status === 'applied'),
    []
  )

  const nextAction =
    inProgress[0] ?? recommended[0] ?? MOCK_SCHOLARSHIPS[0] ?? null

  async function ping() {
    const [a, b] = await Promise.all([
      fetch('/api/db-health').then((r) => r.json()),
      fetch('/api/claude-health').then((r) => r.json()),
    ])
    setDb(a)
    setClaude(b)
    setHealth({ ok: true })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
        <section className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4 md:max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Your personal scholarship studio
            </p>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
              Turn scholarship chaos into a calm, winnable plan.
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              GoGetScholarship finds high‑fit scholarships, explains what they
              really care about, and drafts essays that actually sound like
              you.
            </p>
          </div>

          <aside className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-md shadow-black/5 ring-1 ring-border">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              <span>Next best action</span>
            </div>
            {nextAction ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Focus scholarship
                  </p>
                  <p className="font-display text-lg leading-snug">
                    {nextAction.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextAction.sponsor} • {nextAction.amount}
                  </p>
                </div>
                <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{nextAction.nextStep}</span>
                </p>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Open this scholarship
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-[11px] text-muted-foreground">
                  We’ll keep this panel updated as you move applications from
                  Recommended → In Progress → Applied.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add your profile to see where to start first.
              </p>
            )}
          </aside>
        </section>

        <section aria-label="Scholarship board" className="grid gap-6 lg:grid-cols-3">
          <Column
            title="Recommended"
            tone="These look tailor‑made for you."
            color="blue"
            items={recommended}
          />
          <Column
            title="In Progress"
            tone="Finish these before you pick new ones."
            color="amber"
            items={inProgress}
          />
          <Column
            title="Applied"
            tone="Nice work. Track outcomes and reuse drafts."
            color="green"
            items={applied}
          />
        </section>

        <section
          aria-label="System status"
          className="mt-2 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
        >
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              <span>System status</span>
            </div>
            <button
              type="button"
              onClick={ping}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Run health check</span>
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Checks connectivity to your database and Claude. This is just for
              you and judges&mdash;students will never see it.
            </p>
          </div>

          <pre className="max-h-52 overflow-auto rounded-2xl bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-sm ring-1 ring-border">
{JSON.stringify({ health, db, claude }, null, 2)}
          </pre>
        </section>
      </main>
    </div>
  )
}

type ColumnProps = {
  title: string
  tone: string
  color: 'blue' | 'amber' | 'green'
  items: ScholarshipCard[]
}

function Column({ title, tone, color, items }: ColumnProps) {
  const colorClasses =
    color === 'blue'
      ? 'bg-accent text-accent-foreground'
      : color === 'amber'
        ? 'bg-[#fff2d5] text-[#8a5a12]'
        : 'bg-[#e1f3eb] text-[#1f5b41]'

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <header className="space-y-1">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${colorClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span>{title}</span>
        </div>
        <p className="text-xs text-muted-foreground">{tone}</p>
      </header>

      <div className="flex flex-1 flex-col gap-3">
        {items.map((scholarship) => (
          <article
            key={scholarship.id}
            className="group rounded-xl border border-border bg-background/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
          >
            <h2 className="font-display text-base leading-snug">
              {scholarship.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {scholarship.sponsor}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
                {scholarship.amount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-muted-foreground ring-1 ring-border">
                <Clock className="h-3 w-3" />
                <span>{scholarship.deadline}</span>
              </span>
              <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground">
                {scholarship.matchLabel}
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {scholarship.nextStep}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition group-hover:translate-x-0.5"
            >
              Open details
              <ArrowRight className="h-3 w-3" />
            </button>
          </article>
        ))}

        {items.length === 0 && (
          <p className="rounded-xl bg-muted/60 p-4 text-xs text-muted-foreground">
            Nothing here yet. As you work with GoGetScholarship, we&apos;ll
            start placing scholarships into this column.
          </p>
        )}
      </div>
    </div>
  )
}
