import { Link } from '@tanstack/react-router'

import * as React from 'react'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Home,
  Menu,
  Network,
  SquareFunction,
  StickyNote,
  SunMedium,
  MoonStar,
  X,
} from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [groupedExpanded, setGroupedExpanded] = React.useState<
    Record<string, boolean>
  >({})
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  function toggleTheme() {
    setIsDark((prev) => !prev)
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background p-2 text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Link to="/" className="flex items-baseline gap-2">
              <span className="font-display text-lg tracking-tight">
                GoGetScholarship
              </span>
              <span className="hidden text-[11px] font-medium uppercase text-muted-foreground sm:inline">
                Studio
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/debug"
              className="hidden items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Lab</span>
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {isDark ? (
                <SunMedium className="h-3.5 w-3.5" />
              ) : (
                <MoonStar className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isDark ? 'Light mode' : 'Dark mode'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-80 flex-col bg-card text-foreground shadow-2xl ring-1 ring-border transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Navigation
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground transition hover:bg-muted"
            activeProps={{
              className:
                'mb-2 flex items-center gap-3 rounded-lg bg-primary text-primary-foreground p-3 text-sm transition hover:bg-primary/90',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/admin/debug"
            onClick={() => setIsOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground transition hover:bg-muted"
            activeProps={{
              className:
                'mb-2 flex items-center gap-3 rounded-lg bg-primary text-primary-foreground p-3 text-sm transition hover:bg-primary/90',
            }}
          >
            <Network size={20} />
            <span className="font-medium">Admin Lab</span>
          </Link>

          {/* Reserved for future navigation items (profile, history, etc.) */}
        </nav>
      </aside>
    </>
  )
}
/**
 * App Header
 * - Simple navigation header rendered by the root shell
 * - Extend with links to key routes like /profile and /admin/debug
 */
