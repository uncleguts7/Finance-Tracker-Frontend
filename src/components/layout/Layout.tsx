import { NavLink, Outlet } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useGaps } from '@/hooks/useGaps'

export function Layout() {
  const { user, logout } = useAuth()
  const isFetching = useIsFetching() > 0
  const { data: gapsData } = useGaps()
  const gapCount = gapsData?.gaps?.length ?? 0

  // Show badge if there are gaps, even if banner was dismissed
  const showGapsLink = gapCount > 0

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="font-semibold">Finance Tracker</span>
          <div className="flex items-center gap-3">
            {isFetching && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"
                role="status"
                aria-label="Refreshing data"
              />
            )}
            <span className="text-sm text-neutral-500">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <nav className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
            >
              Categories
            </NavLink>
            {showGapsLink && (
              <NavLink
                to="/gaps"
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
              >
                Gaps
                <Badge variant="destructive" className="ml-1">
                  {gapCount}
                </Badge>
              </NavLink>
            )}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
            >
              Settings
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}