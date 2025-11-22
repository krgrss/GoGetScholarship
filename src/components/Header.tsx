import * as React from 'react'
import {
  Activity,
  Home,
  Menu,
  MoonStar,
  Network,
  SunMedium,
  User,
  X,
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
        to="/onboarding"
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
          <Link to="/onboarding">
            <Avatar className="h-8 w-8 border border-border transition hover:ring-2 hover:ring-primary/20">
              <AvatarImage src="/placeholder-user.jpg" alt="User" />
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                ME
              </AvatarFallback>
            </Avatar>
          </Link>

          <Link
            to="/admin/debug"
            className="hidden items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Lab</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-full"
          >
            {isDark ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
