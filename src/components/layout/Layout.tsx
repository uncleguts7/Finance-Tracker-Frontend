import { NavLink, Outlet } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/hooks/useAuth'
import { useGaps } from '@/hooks/useGaps'
import { cn } from '@/lib/utils'

function NavTab({ to, label, badge }: { to: string; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-secondary text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {label}
      {badge != null && badge > 0 && (
        <Badge variant="destructive" className="px-1.5">
          {badge}
        </Badge>
      )}
    </NavLink>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const isFetching = useIsFetching() > 0
  const { data: gapsData } = useGaps()
  const gapCount = gapsData?.gaps?.length ?? 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Finance Tracker</span>
          </div>

          <nav className="hidden items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1 sm:flex">
            <NavTab to="/" label="Dashboard" />
            <NavTab to="/categories" label="Categories" />
            {gapCount > 0 && <NavTab to="/gaps" label="Gaps" badge={gapCount} />}
            <NavTab to="/settings" label="Settings" />
          </nav>

          <div className="flex items-center gap-3">
            {isFetching && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground"
                role="status"
                aria-label="Refreshing data"
              />
            )}
            <ThemeToggle />
            <span className="hidden text-right text-sm leading-tight md:block">
              <span className="block font-medium">{user?.name}</span>
              <span className="block text-xs text-muted-foreground">{user?.email}</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
              className="rounded-full"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1.5 sm:hidden">
          <NavTab to="/" label="Dashboard" />
          <NavTab to="/categories" label="Categories" />
          {gapCount > 0 && <NavTab to="/gaps" label="Gaps" badge={gapCount} />}
          <NavTab to="/settings" label="Settings" />
        </nav>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
