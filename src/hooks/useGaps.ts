import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import type { Gap, GapBackfillInput } from '@/lib/types'
import { gapBackfillSchema, gapSkipSchema } from '@/lib/schemas'

export function useGaps() {
  return useQuery({ queryKey: ['gaps'], queryFn: api.getGaps })
}

interface UseBackfillGapOptions {
  onSuccess?: () => void
}

export function useBackfillGap({ onSuccess }: UseBackfillGapOptions = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: GapBackfillInput) => api.backfillGap(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['gaps'] })
      await queryClient.cancelQueries({ queryKey: ['months'] })

      const previousGaps = queryClient.getQueryData<{ gaps: Gap[] }>(['gaps'])
      const previousMonths = queryClient.getQueryData(['months'])

      // Optimistically remove the gap from the list
      queryClient.setQueryData<{ gaps: Gap[] }>(['gaps'], (old) =>
        old ? { gaps: old.gaps.filter((g) => !(g.year === payload.year && g.month_number === payload.month_number)) } : old,
      )

      return { previousGaps, previousMonths }
    },
    onError: (error, _payload, context) => {
      if (context?.previousGaps) queryClient.setQueryData(['gaps'], context.previousGaps)
      if (context?.previousMonths) queryClient.setQueryData(['months'], context.previousMonths)

      if (error instanceof Error && 'isValidationError' in error && (error as any).isValidationError()) {
        // Validation errors handled by form-level applyServerErrors
        return
      }
      toast({ title: 'Failed to backfill month', variant: 'destructive' })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      void queryClient.invalidateQueries({ queryKey: ['gaps'] })
      toast({ title: 'Month backfilled' })
      onSuccess?.()
    },
  })
}

interface UseSkipGapOptions {
  onSuccess?: () => void
}

export function useSkipGap({ onSuccess }: UseSkipGapOptions = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (payload: { year: number; month_number: number }) => api.skipGap(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['gaps'] })
      await queryClient.cancelQueries({ queryKey: ['months'] })

      const previousGaps = queryClient.getQueryData<{ gaps: Gap[] }>(['gaps'])
      const previousMonths = queryClient.getQueryData(['months'])

      // Optimistically remove the gap from the list
      queryClient.setQueryData<{ gaps: Gap[] }>(['gaps'], (old) =>
        old ? { gaps: old.gaps.filter((g) => !(g.year === payload.year && g.month_number === payload.month_number)) } : old,
      )

      return { previousGaps, previousMonths }
    },
    onError: (error, _payload, context) => {
      if (context?.previousGaps) queryClient.setQueryData(['gaps'], context.previousGaps)
      if (context?.previousMonths) queryClient.setQueryData(['months'], context.previousMonths)

      if (error instanceof Error && 'isValidationError' in error && (error as any).isValidationError()) {
        const apiError = error as any
        if (apiError.message === 'This month already exists') {
          toast({ title: 'This month already exists', variant: 'destructive' })
          return
        }
        // Other validation errors handled by form-level applyServerErrors
        return
      }
      toast({ title: 'Failed to skip month', variant: 'destructive' })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['months'] })
      void queryClient.invalidateQueries({ queryKey: ['gaps'] })
      toast({ title: 'Month skipped' })
      onSuccess?.()
    },
  })
}

export { gapBackfillSchema, gapSkipSchema }