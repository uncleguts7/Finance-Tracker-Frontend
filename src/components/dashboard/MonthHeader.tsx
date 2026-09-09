import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { Month, MonthSummary } from '@/lib/types'
import { cn, formatMonthLabel, toNumber } from '@/lib/utils'

interface MonthHeaderProps {
  month: Month
}

function validateField(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const num = Number(trimmed)
  if (Number.isNaN(num)) return 'Enter a valid number'
  if (num < 0) return "Can't be negative"
  return undefined
}

interface UpdateVariables {
  income: number
  savings_goal: number
}

export function MonthHeader({ month }: MonthHeaderProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [income, setIncome] = useState('')
  const [savings, setSavings] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ income?: string; savings?: string }>({})

  const monthId = month.id
  const incomeValue = toNumber(month.income)
  const savingsValue = toNumber(month.savings_goal)

  // Keep inline inputs in sync with the (possibly optimistically-updated) month row.
  useEffect(() => {
    setIncome(incomeValue === 0 ? '' : String(month.income))
    setSavings(savingsValue === 0 ? '' : String(month.savings_goal))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthId, incomeValue, savingsValue])

  const updateMutation = useMutation({
    mutationFn: (vars: UpdateVariables) => api.updateMonth(monthId, vars),
    onMutate: async (vars) => {
      // Optimistic update: apply income/savings to both caches, snapshot for rollback (§5).
      await queryClient.cancelQueries({ queryKey: ['months'] })
      await queryClient.cancelQueries({ queryKey: ['summary', monthId] })

      const previousMonths = queryClient.getQueryData<Month[]>(['months'])
      const previousSummary = queryClient.getQueryData<MonthSummary>(['summary', monthId])

      const incomeStr = vars.income.toFixed(2)
      const savingsGoalStr = vars.savings_goal.toFixed(2)

      queryClient.setQueryData<Month[]>(['months'], (old) =>
        old?.map((m) =>
          m.id === monthId ? { ...m, income: incomeStr, savings_goal: savingsGoalStr } : m,
        ),
      )
      queryClient.setQueryData<MonthSummary>(['summary', monthId], (old) =>
        old ? { ...old, income: incomeStr, savings_goal: savingsGoalStr } : old,
      )

      return { previousMonths, previousSummary }
    },
    onError: (_error, _vars, context) => {
      if (context?.previousMonths) queryClient.setQueryData(['months'], context.previousMonths)
      if (context?.previousSummary)
        queryClient.setQueryData(['summary', monthId], context.previousSummary)
      toast({
        title: 'Failed to update month',
        description: 'Your changes were reverted.',
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['summary', monthId] })
      void queryClient.invalidateQueries({ queryKey: ['month', monthId] })
      void queryClient.invalidateQueries({ queryKey: ['months'] })
    },
  })

  function commit() {
    if (!month.is_active) return

    const incomeError = validateField(income)
    const savingsError = validateField(savings)
    setFieldErrors({ income: incomeError, savings: savingsError })
    if (incomeError || savingsError) return

    const nextIncome = income.trim() === '' ? 0 : Number(income)
    const nextSavings = savings.trim() === '' ? 0 : Number(savings)

    if (nextIncome === incomeValue && nextSavings === savingsValue) return

    updateMutation.mutate({ income: nextIncome, savings_goal: nextSavings })
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          {formatMonthLabel(month.year, month.month_number)}
        </h1>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Active
        </span>
      </div>

      <form
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          commit()
        }}
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="month-income">Monthly income</Label>
          <Input
            id="month-income"
            type="text"
            inputMode="decimal"
            placeholder="Set income"
            value={income}
            onChange={(event) => {
              setIncome(event.target.value)
              if (fieldErrors.income) setFieldErrors((prev) => ({ ...prev, income: undefined }))
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            disabled={!month.is_active}
            aria-invalid={!!fieldErrors.income}
            className={cn(fieldErrors.income && 'border-red-500 focus-visible:ring-red-500')}
          />
          {fieldErrors.income && <p className="text-xs text-red-600">{fieldErrors.income}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="month-savings">Savings goal</Label>
          <Input
            id="month-savings"
            type="text"
            inputMode="decimal"
            placeholder="Set savings goal"
            value={savings}
            onChange={(event) => {
              setSavings(event.target.value)
              if (fieldErrors.savings) setFieldErrors((prev) => ({ ...prev, savings: undefined }))
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            disabled={!month.is_active}
            aria-invalid={!!fieldErrors.savings}
            className={cn(fieldErrors.savings && 'border-red-500 focus-visible:ring-red-500')}
          />
          {fieldErrors.savings && <p className="text-xs text-red-600">{fieldErrors.savings}</p>}
        </div>
      </form>
    </section>
  )
}