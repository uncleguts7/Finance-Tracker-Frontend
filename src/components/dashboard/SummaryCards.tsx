import type { ReactNode } from 'react'
import { BadgeCheck, CheckCircle2, Landmark, TrendingDown, XCircle } from 'lucide-react'

import type { MonthSummary } from '@/lib/types'
import { cn, formatCurrency, toNumber } from '@/lib/utils'

function MetricCard({
  label,
  icon,
  value,
  chip,
  caption,
  captionTone = 'muted',
}: {
  label: string
  icon: ReactNode
  value?: ReactNode
  chip?: ReactNode
  caption: string
  captionTone?: 'muted' | 'positive' | 'negative'
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        {value}
        {chip}
      </div>
      <p
        className={cn(
          'mt-1 text-xs',
          captionTone === 'positive' && 'font-medium text-positive',
          captionTone === 'negative' && 'font-medium text-destructive',
          captionTone === 'muted' && 'text-muted-foreground',
        )}
      >
        {caption}
      </p>
    </div>
  )
}

const metricClass = 'text-[28px] font-semibold leading-8 tracking-tight tabular-nums'

function statusChip(onBudget: boolean) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold',
        onBudget ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', onBudget ? 'bg-positive' : 'bg-destructive')} />
      {onBudget ? 'On budget' : 'Overspent'}
    </span>
  )
}

export function SummaryCards({ summary }: { summary: MonthSummary }) {
  const income = toNumber(summary.income)
  const totalSpent = toNumber(summary.total_spent)
  const remaining = toNumber(summary.remaining)
  const available = toNumber(summary.available_to_spend)
  const savingsGoal = toNumber(summary.savings_goal)
  const isOverspent = summary.is_overspent === true

  const spentPct = income > 0 ? (totalSpent / income) * 100 : null
  const remainingPct = income > 0 ? (remaining / income) * 100 : null
  const safeRoom = available - totalSpent
  const remainingPositive = remaining >= 0 && !isOverspent

  return (
    <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Spent"
        icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        value={<span className={metricClass}>{formatCurrency(summary.total_spent)}</span>}
        caption={spentPct != null ? `${spentPct.toFixed(1)}% of total income` : 'No income recorded'}
      />

      <MetricCard
        label="Remaining"
        icon={
          remainingPositive ? (
            <CheckCircle2 className="h-4 w-4 text-positive" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )
        }
        value={<span className={metricClass}>{formatCurrency(summary.remaining)}</span>}
        chip={
          remainingPct != null && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                remainingPositive
                  ? 'bg-positive/10 text-positive'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {remainingPct >= 0 ? '+' : ''}
              {remainingPct.toFixed(1)}%
            </span>
          )
        }
        caption={remainingPositive ? 'Positive delta surplus' : 'Overdrawn this cycle'}
        captionTone={remainingPositive ? 'positive' : 'negative'}
      />

      <MetricCard
        label="Available to Spend"
        icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
        value={<span className={metricClass}>{formatCurrency(summary.available_to_spend)}</span>}
        caption={`Post-savings target (${formatCurrency(savingsGoal)})`}
      />

      <MetricCard
        label="Budget Status"
        icon={
          <BadgeCheck
            className={cn('h-4 w-4', isOverspent ? 'text-destructive' : 'text-positive')}
          />
        }
        value={statusChip(!isOverspent)}
        caption={
          isOverspent
            ? `${formatCurrency(Math.abs(safeRoom))} over target`
            : `${formatCurrency(safeRoom)} safe room`
        }
        captionTone={isOverspent ? 'negative' : 'muted'}
      />
    </section>
  )
}
