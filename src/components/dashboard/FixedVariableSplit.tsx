import { useMemo } from 'react'

import type { Expense } from '@/lib/types'
import { formatCurrency, toNumber } from '@/lib/utils'

const compactFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

/** Fixed vs Variable donut — derived from the real expense list, no backend change needed. */
export function FixedVariableSplit({ expenses }: { expenses: Expense[] }) {
  const { fixed, variable } = useMemo(() => {
    let fixed = 0
    let variable = 0
    for (const e of expenses) {
      if (e.type === 'fixed') fixed += toNumber(e.amount)
      else variable += toNumber(e.amount)
    }
    return { fixed, variable }
  }, [expenses])

  const total = fixed + variable
  const fixedPct = total > 0 ? (fixed / total) * 100 : 0
  const variablePct = total > 0 ? 100 - fixedPct : 0

  return (
    <section className="flex flex-col items-center rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-2 flex w-full items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Fixed vs Variable
        </span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Split
        </span>
      </div>

      <div className="relative my-2 flex h-36 w-36 items-center justify-center">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            strokeWidth="3.5"
            className="stroke-secondary"
          />
          {total > 0 && (
            <>
              {/* Fixed segment (obsidian) */}
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${fixedPct} ${100 - fixedPct}`}
                className="stroke-foreground"
              />
              {/* Variable segment (green) */}
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${variablePct} ${100 - variablePct}`}
                strokeDashoffset={-fixedPct}
                className="stroke-positive"
              />
            </>
          )}
        </svg>
        <div className="absolute flex flex-col items-center text-center">
          <span className="text-sm font-bold tabular-nums">
            {total > 0 ? compactFormatter.format(total) : '—'}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Disbursed
          </span>
        </div>
      </div>

      <div className="mt-2 grid w-full grid-cols-2 gap-2">
        {(
          [
            ['Fixed', fixed, fixedPct, 'bg-foreground'],
            ['Variable', variable, variablePct, 'bg-positive'],
          ] as const
        ).map(([label, amount, pct, dot]) => (
          <div key={label} className="flex items-center gap-2 rounded-lg bg-secondary p-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
            <div className="flex min-w-0 flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <span className="truncate text-sm font-medium tabular-nums">
                {formatCurrency(amount)} ({pct.toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
