import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { useToast } from '@/components/ui/toast'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const onSuccess = () => {
    toast({ title: 'Password updated' })
    navigate('/settings')
  }

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      {/* Brand mark */}
      <div className="mb-5 flex items-center justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background shadow-md">
          <Lock aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>

      {/* Auth card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Change password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the credentials for your account
          </p>
        </div>
        <ChangePasswordForm onSuccess={onSuccess} />
      </div>

      {/* Security footnote */}
      <div className="mt-5 flex items-center justify-center gap-1 text-muted-foreground/60">
        <Lock aria-hidden="true" className="h-3 w-3" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">
          256-bit encrypted ledger connection
        </span>
      </div>
    </div>
  )
}
