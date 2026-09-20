import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useAuth } from '@/hooks/useAuth'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/schemas'

import { PasswordVisibilityToggle } from './PasswordVisibilityToggle'

const fieldClass =
  'h-10 w-full rounded-md border border-transparent bg-input-fill px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/10'

export function ChangePasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { changePassword } = useAuth()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePassword(values.current_password, values.password, values.password_confirmation)
      onSuccess()
    } catch (error) {
      applyServerErrors(error, setError)
    }
  })

  const fields = [
    {
      id: 'current_password',
      label: 'Current password',
      autoComplete: 'current-password',
      visible: showCurrent,
      toggle: () => setShowCurrent((v) => !v),
    },
    {
      id: 'password',
      label: 'New password',
      autoComplete: 'new-password',
      visible: showNew,
      toggle: () => setShowNew((v) => !v),
    },
    {
      id: 'password_confirmation',
      label: 'Confirm new password',
      autoComplete: 'new-password',
      visible: showConfirm,
      toggle: () => setShowConfirm((v) => !v),
    },
  ] as const

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {errors.root && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errors.root.message}
        </p>
      )}

      {fields.map(({ id, label, autoComplete, visible, toggle }) => (
        <div key={id} className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
          <div className="relative flex items-center">
            <input
              id={id}
              type={visible ? 'text' : 'password'}
              autoComplete={autoComplete}
              aria-invalid={!!errors[id]}
              disabled={isSubmitting}
              className={cn(
                fieldClass,
                'pr-10',
                errors[id] && 'border-destructive focus:ring-destructive/10',
              )}
              {...register(id)}
            />
            <PasswordVisibilityToggle visible={visible} onToggle={toggle} />
          </div>
          {errors[id] && <p className="text-sm text-destructive">{errors[id]?.message}</p>}
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Your new password must be different from your current password.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 flex h-10 w-full items-center justify-center rounded-md bg-primary text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
