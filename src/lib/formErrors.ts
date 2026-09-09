import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'

import { ApiError } from './api'

/**
 * Maps a server error onto React Hook Form `setError`.
 *
 * - 422 validation errors → per-field errors (only known Zod fields render).
 * - Any other ApiError (e.g. login 401 "Invalid credentials") → `root` banner.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (!(error instanceof ApiError)) return

  if (error.isValidationError()) {
    const fieldErrors = error.getValidationErrors()
    const entries = Object.entries(fieldErrors)
    if (entries.length > 0) {
      for (const [field, messages] of entries) {
        setError(field as FieldPath<T>, { type: 'server', message: messages[0] })
      }
      return
    }
  }

  setError('root', { type: 'server', message: error.message })
}