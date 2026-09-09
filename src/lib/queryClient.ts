import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always refetch on mount
      refetchOnMount: 'always', // Fresh data on every navigation
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false // Don't retry auth failures
        return failureCount < 3
      },
    },
  },
})