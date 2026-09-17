import { LoginForm } from '@/components/auth/LoginForm'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-5 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-md">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
        </div>

        {/* Auth card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back to Finance Tracker
            </p>
          </div>
          <LoginForm />
        </div>

        {/* Security footnote */}
        <div className="mt-5 flex items-center justify-center gap-1 text-muted-foreground/60">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">
            256-bit encrypted ledger connection
          </span>
        </div>
      </div>
    </div>
  )
}
