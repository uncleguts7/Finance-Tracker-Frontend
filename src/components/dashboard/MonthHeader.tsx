import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, Pencil } from 'lucide-react'

import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { Month, MonthSummary } from '@/lib/types'
import { cn, formatCurrency, formatMonthLabel, toNumber } from '@/lib/utils'

interface MonthHeaderProps {
  month: Month
}

function validateAmount(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const num = Number(trimmed)
  if (Number.isNaN(num)) return 'Enter a valid number'
  if (num < 0) return "Can't be negative"
  return undefined
}

/** Compact value pill that expands into an inline number input on edit. */
function EditableMoneyPill({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (next: number) => boolean | void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    const err = validateAmount(text)
    setError(err)
    if (err) return
    const next = text.trim() === '' ? 0 : Number(text)
    setEditing(false)
    if (next !== value) onCommit(next)
  }

  if (editing) {
    return (
      <span className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={text}
          aria-label={label}
          aria-invalid={!!error}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError(undefined)
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className={cn(
            'h-7 w-24 rounded-md border border-border bg-card px-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring',
            error && 'border-destructive',
          )}
        />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{formatCurrency(value)}</span>
      <button
        type="button"
        title={`Edit ${label}`}
        aria-label={`Edit ${label}`}
        onClick={() => {
          setText(value === 0 ? '' : String(value))
          setEditing(true)
        }}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

export function MonthHeader({ month }: MonthHeaderProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const monthId = month.id

  const updateMutation = useMutation({
    mutationFn: (vars: { income: number; savings_goal: number }) =>
      api.updateMonth(monthId, vars),
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
      void queryClient.invalidateQueries({ queryKey: ['months'] })
    },
  })

  function commit(partial: Partial<{ income: number; savings_goal: number }>) {
    if (!month.is_active) return
    updateMutation.mutate({
      income: partial.income ?? toNumber(month.income),
      savings_goal: partial.savings_goal ?? toNumber(month.savings_goal),
    })
  }

  // Days elapsed within this month (active month == current calendar month).
  const year = Number(month.year)
  const monthNumber = Number(month.month_number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const now = new Date()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === monthNumber
  const elapsed = isCurrent ? Math.min(now.getDate(), daysInMonth) : daysInMonth

  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-semibold tracking-tight">
            {formatMonthLabel(month.year, month.month_number)}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-positive/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          Active Cycle
        </span>
        <span className="hidden items-center gap-1 rounded-xl bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex">
          Days elapsed: {elapsed} / {daysInMonth}
        </span>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        <EditableMoneyPill
          label="Income"
          value={toNumber(month.income)}
          onCommit={(income) => commit({ income })}
        />
        <EditableMoneyPill
          label="Goal"
          value={toNumber(month.savings_goal)}
          onCommit={(savings_goal) => commit({ savings_goal })}
        />
      </div>
    </div>
  )
}
