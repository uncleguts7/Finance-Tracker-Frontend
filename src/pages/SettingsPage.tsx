import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserRound, LogOut, KeyRound, ChevronRight, UserCog } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { profileSchema, type ProfileFormValues } from '@/lib/schemas'

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth()

  // Profile form (display name)
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  })

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setError: setErrorProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = profileForm

  const onSubmitProfile = handleSubmitProfile(async (values) => {
    try {
      await updateProfile(values.name)
    } catch (error) {
      applyServerErrors(error, setErrorProfile)
    }
  })

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Account Settings
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
          <span className="text-[11px] text-muted-foreground">Session Active</span>
        </div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight md:text-4xl">
          Settings
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Manage your profile access and session credentials.
        </p>
      </div>

      {/* Account Module */}
      <section className="rounded-xl border border-border bg-card shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
          <UserCog className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Account</h2>
        </div>

        <div className="bg-muted/30 rounded-lg p-5 sm:p-6">
          {/* Avatar + Name + Email */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-primary flex-shrink-0 flex items-center justify-center shadow-sm">
              <UserRound aria-hidden="true" className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              {/* Display name - editable inline */}
              <form onSubmit={onSubmitProfile} noValidate className="flex items-center gap-2 flex-wrap w-full">
                {profileErrors.root && (
                  <p
                    role="alert"
                    className="w-full rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {profileErrors.root.message}
                  </p>
                )}
                <input
                  type="text"
                  autoComplete="name"
                  disabled={isSubmittingProfile}
                  className={cn(
                    'flex-1 min-w-0 h-9 rounded-md border border-transparent bg-input-fill px-3 text-base font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/10',
                    profileErrors.name && 'border-destructive focus:ring-destructive/10'
                  )}
                  {...registerProfile('name')}
                />
                {profileErrors.name && (
                  <p className="w-full text-sm text-destructive">{profileErrors.name.message}</p>
                )}
                <Button type="submit" size="sm" disabled={isSubmittingProfile} className="shrink-0">
                  {isSubmittingProfile ? 'Saving…' : 'Save'}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            {/* Change password action row */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <KeyRound className="h-5 w-5 text-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">Change password</p>
                <p className="text-sm text-muted-foreground truncate">
                  Update your account password
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="shrink-0 gap-1.5"
            >
              <a href="/settings/change-password">
                Change
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            {/* Logout */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <LogOut className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">Log out</p>
                <p className="text-sm text-muted-foreground truncate">
                  End your current session
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
              className="shrink-0"
            >
              Log out
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}