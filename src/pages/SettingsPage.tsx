import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { profileSchema, type ProfileFormValues } from '@/lib/schemas'
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/schemas'

function formatJoinedDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth()

  // Profile form
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

  // Password form
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    setError: setErrorPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = passwordForm

  const onSubmitPassword = handleSubmitPassword(async (values) => {
    try {
      await changePassword(values.current_password, values.password, values.password_confirmation)
      resetPasswordForm()
    } catch (error) {
      applyServerErrors(error, setErrorPassword)
    }
  })

  if (!user) return null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Profile Section */}
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium">Profile</h2>
        <form onSubmit={onSubmitProfile} noValidate className="mt-4 space-y-4">
          {profileErrors.root && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {profileErrors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Jane Doe"
              aria-invalid={!!profileErrors.name}
              className={cn(profileErrors.name && 'border-red-500 focus-visible:ring-red-500')}
              disabled={isSubmittingProfile}
              {...registerProfile('name')}
            />
            {profileErrors.name && (
              <p className="text-sm text-red-600">{profileErrors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={user.email}
              readOnly
              className="bg-neutral-50 cursor-not-allowed"
              aria-describedby="email-hint"
            />
            <p id="email-hint" className="text-xs text-neutral-500">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="created_at">Member since</Label>
            <Input
              id="created_at"
              value={user.created_at ? `Joined ${formatJoinedDate(user.created_at)}` : '—'}
              readOnly
              className="bg-neutral-50 cursor-not-allowed"
            />
          </div>

          <Button type="submit" disabled={isSubmittingProfile}>
            {isSubmittingProfile ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </section>

      {/* Password Section */}
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium">Password</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Your new password must be different from your current password.
        </p>
        <form onSubmit={onSubmitPassword} noValidate className="mt-4 space-y-4">
          {passwordErrors.root && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {passwordErrors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!passwordErrors.current_password}
              className={cn(passwordErrors.current_password && 'border-red-500 focus-visible:ring-red-500')}
              disabled={isSubmittingPassword}
              {...registerPassword('current_password')}
            />
            {passwordErrors.current_password && (
              <p className="text-sm text-red-600">{passwordErrors.current_password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!passwordErrors.password}
              className={cn(passwordErrors.password && 'border-red-500 focus-visible:ring-red-500')}
              disabled={isSubmittingPassword}
              {...registerPassword('password')}
            />
            {passwordErrors.password && (
              <p className="text-sm text-red-600">{passwordErrors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm new password</Label>
            <Input
              id="password_confirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!passwordErrors.password_confirmation}
              className={cn(passwordErrors.password_confirmation && 'border-red-500 focus-visible:ring-red-500')}
              disabled={isSubmittingPassword}
              {...registerPassword('password_confirmation')}
            />
            {passwordErrors.password_confirmation && (
              <p className="text-sm text-red-600">{passwordErrors.password_confirmation.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmittingPassword}>
            {isSubmittingPassword ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </section>
    </div>
  )
}