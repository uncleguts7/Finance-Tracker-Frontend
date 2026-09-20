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
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.root && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errors.root.message}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Jane Doe"
          aria-invalid={!!errors.name}
          className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          className={cn(errors.email && 'border-red-500 focus-visible:ring-red-500')}
          {...register('email')}
        />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative flex items-center">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className={cn(
              'pr-10',
              errors.password && 'border-red-500 focus-visible:ring-red-500',
            )}
            {...register('password')}
          />
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password_confirmation">Confirm password</Label>
        <div className="relative flex items-center">
          <Input
            id="password_confirmation"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.password_confirmation}
            className={cn(
              'pr-10',
              errors.password_confirmation && 'border-red-500 focus-visible:ring-red-500',
            )}
            {...register('password_confirmation')}
          />
          <PasswordVisibilityToggle
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
          />
        </div>
        {errors.password_confirmation && (
          <p className="text-sm text-red-600">{errors.password_confirmation.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}