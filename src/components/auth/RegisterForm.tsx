import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { applyServerErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { registerSchema, type RegisterFormValues } from '@/lib/schemas'

import { PasswordVisibilityToggle } from './PasswordVisibilityToggle'

const fieldClass =
  'h-10 w-full rounded-md border border-transparent bg-input-fill px-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/10'

export function RegisterForm() {
  const { register: registerUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser(
        values.name,
        values.email,
        values.password,
        values.password_confirmation,
      )
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
        <Label htmlFor="name" className="text-[13px] font-medium text-foreground">
          Name
        </Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Jane Doe"
          aria-invalid={!!errors.name}
          className={cn(
            fieldClass,
            errors.name && 'border-destructive focus:ring-destructive/10',
          )}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
          Email
        </Label>
        <Input
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
        <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
          Password
        </Label>
        <div className="relative flex items-center">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
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
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password_confirmation" className="text-[13px] font-medium text-foreground">
          Confirm password
        </Label>
        <div className="relative flex items-center">
          <Input
            id="password_confirmation"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.password_confirmation}
            className={cn(
              fieldClass,
              'pr-10',
              errors.password_confirmation && 'border-destructive focus:ring-destructive/10',
            )}
            {...register('password_confirmation')}
          />
          <PasswordVisibilityToggle
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
          />
        </div>
        {errors.password_confirmation && (
          <p className="text-sm text-destructive">{errors.password_confirmation.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="ml-1 text-[13px] font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}