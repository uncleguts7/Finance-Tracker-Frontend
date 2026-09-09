import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function SettingsPage() {
  const { user, logout } = useAuth()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-500">Account</p>
        <p className="mt-2 font-medium">{user?.name}</p>
        <p className="text-sm text-neutral-500">{user?.email}</p>
        <Button variant="outline" onClick={logout} className="mt-5">
          Log out
        </Button>
      </div>
    </div>
  )
}