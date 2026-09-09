import { Outlet } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function Layout() {
  const { user, logout } = useAuth()
  const isFetching = useIsFetching() > 0

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
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}