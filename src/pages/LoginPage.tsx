import { LoginForm } from '@/components/auth/LoginForm'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">Welcome back to Finance Tracker</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}