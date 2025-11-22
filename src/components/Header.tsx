import * as React from 'react'
import {
  Activity,
  Home,
  Menu,
  MoonStar,
  Network,
  Sparkles,
  SunMedium,
  User,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export default function Header() {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })
  const [student, setStudent] = React.useState<{ id: string; email?: string | null; name?: string | null } | null>(null)
  const [authLoading, setAuthLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function loadMe() {
      try {
        const res = await fetch('/api/auth/me')
        const json = await res.json()
        if (!cancelled && res.ok && json.ok !== false) {
          setStudent(json.student ?? null)
        }
      } catch {
        // ignore
      }
    }
    void loadMe()
    return () => {
      cancelled = true
    }
  }, [])

  function clearLocalState() {
    try {
      localStorage.removeItem('scholarship_student_id')
      localStorage.removeItem('student_id')
      localStorage.removeItem('scholarship_profile')
      localStorage.removeItem('profile')
      Object.keys(localStorage)
        .filter((k) => k.startsWith('planner_tasks_'))
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }

  async function handleLogin() {
    const input = window.prompt('Enter your student ID (UUID) or leave blank to create a new one:')?.trim()
    const studentId = input && input.length > 0 ? input : null
    setAuthLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId || undefined }),
      })
      const json = await res.json()
      if (res.ok && json.ok !== false) {
        clearLocalState()
        localStorage.setItem('scholarship_student_id', json.student_id)
        localStorage.setItem('student_id', json.student_id)
        setStudent({ id: json.student_id })
      }
    } catch {
      // ignore errors for demo
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    setAuthLoading(true)
    try {
      await fetch('/api/auth/login', { method: 'DELETE' })
      setStudent(null)
      clearLocalState()
    } catch {
      // ignore
    } finally {
      setAuthLoading(false)
    }
  }

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

  const NavLinks = ({ mobile = false, onClick }: { mobile?: boolean; onClick?: () => void }) => (
    <>
      <Link
        to="/matches"
        onClick={onClick}
        className={`transition hover:text-foreground ${
          mobile
            ? 'flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-muted'
            : 'text-sm font-medium text-muted-foreground'
        }`}
        activeProps={{
          className: mobile
            ? 'flex items-center gap-3 rounded-lg bg-primary text-primary-foreground p-3 text-sm hover:bg-primary/90'
            : 'text-foreground underline decoration-primary/60 underline-offset-4',
        }}
      >
        {mobile && <Network size={20} />}
        <span>Matches</span>
      </Link>
      <Link
        to="/dashboard"
        onClick={onClick}
        className={`transition hover:text-foreground ${
          mobile
            ? 'flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-muted'
            : 'text-sm font-medium text-muted-foreground'
        }`}
        activeProps={{
          className: mobile
            ? 'flex items-center gap-3 rounded-lg bg-primary text-primary-foreground p-3 text-sm hover:bg-primary/90'
            : 'text-foreground underline decoration-primary/60 underline-offset-4',
        }}
      >
        {mobile && <Home size={20} />}
        <span>Dashboard</span>
      </Link>
      <Link
        to="/custom"
        onClick={onClick}
        className={`transition hover:text-foreground ${
          mobile
            ? 'flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-muted'
            : 'text-sm font-medium text-muted-foreground'
        }`}
        activeProps={{
          className: mobile
            ? 'flex items-center gap-3 rounded-lg bg-primary text-primary-foreground p-3 text-sm hover:bg-primary/90'
            : 'text-foreground underline decoration-primary/60 underline-offset-4',
        }}
      >
        {mobile && <Sparkles size={20} />}
        <span>Custom</span>
      </Link>
      <Link
        to="/profile"
        onClick={onClick}
        className={`transition hover:text-foreground ${
          mobile
            ? 'flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground hover:bg-muted'
            : 'text-sm font-medium text-muted-foreground'
        }`}
        activeProps={{
          className: mobile
            ? 'flex items-center gap-3 rounded-lg bg-primary text-primary-foreground p-3 text-sm hover:bg-primary/90'
            : 'text-foreground underline decoration-primary/60 underline-offset-4',
        }}
      >
        {mobile && <User size={20} />}
        <span>Profile</span>
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="border-b p-4 text-left">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 p-4">
                <NavLinks mobile />
                <Link
                  to="/admin/debug"
                  className="flex items-center gap-3 rounded-lg p-3 text-sm text-muted-foreground transition hover:bg-muted"
                >
                  <Activity size={20} />
                  <span>Admin Lab</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-lg tracking-tight">
              GoGetScholarship
            </span>
            <span className="hidden text-[11px] font-medium uppercase text-muted-foreground sm:inline">
              Studio
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/profile">
            <Avatar className="h-8 w-8 border border-border transition hover:ring-2 hover:ring-primary/20">
              <AvatarImage
                src="https://placehold.co/64x64?text=ME"
                alt="User"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                ME
              </AvatarFallback>
            </Avatar>
          </Link>

          {student ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {student.email || student.name || 'Signed in'}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={authLoading}>
                {authLoading ? '...' : 'Log out'}
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={handleLogin} disabled={authLoading}>
              {authLoading ? '...' : 'Sign in'}
            </Button>
          )}

          {/* Hide admin lab entry in demo/login-first flows */}
        </div>
      </div>
    </header>
  )
}
