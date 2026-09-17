import { useMemo } from 'react'

import type { MonthSummary } from '@/lib/types'
import { formatCurrency, toNumber } from '@/lib/utils'

import { EmptyState } from './EmptyState'

// Rank-ordered bar tones matching the Stitch reference (dark → muted → green accents).
const barTones = [
  'bg-foreground',
  'bg-muted-foreground',
  'bg-positive',
  'bg-zinc-400 dark:bg-zinc-500',
  'bg-zinc-300 dark:bg-zinc-600',
  'bg-zinc-500',
]

export function CategoryBreakdown({ summary }: { summary: MonthSummary }) {
  const items = useMemo(() => {
    return (summary.spending_by_category ?? [])
      .map((item) => ({ name: item.category_name, total: toNumber(item.total) }))
      .sort((a, b) => b.total - a.total)
  }, [summary.spending_by_category])

  const totalSpent = toNumber(summary.total_spent)

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Spending by Category</h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Active share
        </span>
      </div>

      {items.length === 0 || totalSpent <= 0 ? (
        <EmptyState title="No spending by category yet" />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item, i) => {
            const pct = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0
            return (
              <div key={item.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{item.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <strong className="font-semibold text-foreground">
                      {formatCurrency(item.total)}
                    </strong>{' '}
                    · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${barTones[i % barTones.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
