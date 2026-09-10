import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

/**
 * Categories query hook.
 * Returns non-deleted categories for the authenticated user.
 * Invalidated on POST/PUT/DELETE /categories (see Frontend-System-Design.md §3.3).
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })
}