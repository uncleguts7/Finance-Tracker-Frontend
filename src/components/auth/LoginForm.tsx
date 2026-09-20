import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { loginSchema, type LoginFormValues } from '@/lib/schemas'

import { PasswordVisibilityToggle } from './PasswordVisibilityToggle'

const fieldClass =
  'h-10 w-full rounded-md border border-transparent bg-input-fill px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/10'

export function LoginForm() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
    } catch (error) {
      applyServerErrors(error, setError)
    }
  })

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          className={cn(
            fieldClass,
            errors.email && 'border-destructive focus:ring-destructive/10',
          )}
          {...register('email')}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[13px] font-medium text-foreground">
          Password
        </label>
        <div className="relative flex items-center">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className={cn(
              fieldClass,
              'pr-10',
              errors.password && 'border-destructive focus:ring-destructive/10',
            )}
            {...register('password')}
          />
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 flex h-10 w-full items-center justify-center rounded-md bg-primary text-[13px] font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?
        <Link
          to="/register"
          className="ml-1 text-[13px] font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  )
}
