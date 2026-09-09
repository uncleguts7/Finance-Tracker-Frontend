import { useMemo } from 'react'

import type { MonthSummary } from '@/lib/types'
import { categoryColor, formatCurrency, toNumber } from '@/lib/utils'

import { EmptyState } from './EmptyState'

export function CategoryBreakdown({ summary }: { summary: MonthSummary }) {
  const items = useMemo(() => {
    return (summary.spending_by_category ?? [])
      .map((item) => ({ name: item.category_name, total: toNumber(item.total) }))
      .sort((a, b) => b.total - a.total)
  }, [summary.spending_by_category])

  const totalSpent = toNumber(summary.total_spent)

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-neutral-900">Spending by category</h2>

      {items.length === 0 || totalSpent <= 0 ? (
        <EmptyState title="No spending by category yet" />
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const pct = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0
            return (
              <li key={item.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-800">{item.name}</span>
                  <span className="font-mono text-neutral-500">
                    {formatCurrency(item.total)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: categoryColor(item.name) }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}