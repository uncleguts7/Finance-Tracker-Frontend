import type { ReactNode } from 'react'

import type { MonthSummary } from '@/lib/types'
import { cn, formatCurrency, toNumber } from '@/lib/utils'

function SummaryCard({
  label,
  tone = 'neutral',
  children,
}: {
  label: string
  tone?: 'neutral' | 'positive' | 'negative'
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
      <p className="text-sm text-neutral-500">{label}</p>
      <div
        className={cn(
          'mt-1 font-mono text-2xl font-semibold',
          tone === 'positive' && 'text-green-600',
          tone === 'negative' && 'text-red-600',
          tone === 'neutral' && 'text-neutral-900',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function SummaryCards({ summary }: { summary: MonthSummary }) {
  const remaining = toNumber(summary.remaining)
  const isOverspent = summary.is_overspent === true
  // Red when negative (§3.2) OR when the month is overspent against the savings goal (§3.4).
  const remainingTone: 'negative' | 'positive' = remaining < 0 || isOverspent ? 'negative' : 'positive'

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Total spent" tone="neutral">
        {formatCurrency(summary.total_spent)}
      </SummaryCard>

      <SummaryCard label="Remaining" tone={remainingTone}>
        {formatCurrency(summary.remaining)}
      </SummaryCard>

      <SummaryCard label="Available to spend" tone="neutral">
        {formatCurrency(summary.available_to_spend)}
      </SummaryCard>

      <SummaryCard label="Budget" tone="neutral">
        {isOverspent ? (
          <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 font-sans text-xs font-medium text-red-700">
            Overspent
          </span>
        ) : (
          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 font-sans text-xs font-medium text-green-700">
            On budget
          </span>
        )}
      </SummaryCard>
    </section>
  )
}