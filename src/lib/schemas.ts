import { z } from 'zod'

import type { Category } from './types'

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Name required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'At least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>

/**
 * Factory function — categories come from a runtime query, not module scope.
 * A static export would close over an empty/undefined array (§6.2).
 * Client-side validation only: the `category_id` refine checks the currently
 * loaded `GET /categories` list; the server 422 is authoritative for the
 * "exists for user AND not soft-deleted" rule.
 */
export const createExpenseSchema = (categories: Category[]) =>
  z
    .object({
      amount: z
        .number({ invalid_type_error: 'Enter an amount' })
        .positive('Amount must be positive')
        .max(999999.99, 'Amount is too large'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
        .optional(), // YYYY-MM-DD
      type: z.enum(['fixed', 'variable']),
      category_id: z
        .number({ invalid_type_error: 'Select a category' })
        .int()
        .positive('Select a category'),
    })
    .refine((data) => categories.some((c) => c.id === data.category_id), {
      message: 'Invalid category',
      path: ['category_id'],
    })

export type ExpenseInput = z.infer<ReturnType<typeof createExpenseSchema>>

export const categorySchema = z.object({
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  default_type: z.enum(['fixed', 'variable']),
})

export type CategoryInput = z.infer<typeof categorySchema>