import type { ReactNode } from 'react'
import { BadgeCheck, Folders, LockKeyhole, SlidersHorizontal } from 'lucide-react'

import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

function MetricCard({
  label,
  icon,
  iconTone,
  value,
  unit,
  chip,
  fillPct,
  fillTone,
}: {
  label: string
  icon: ReactNode
  iconTone?: 'muted' | 'amber' | 'positive'
  value: number
  unit: string
  chip: string
  fillPct: number
  fillTone: 'default' | 'slate' | 'amber' | 'positive'
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            iconTone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
            iconTone === 'positive' &&
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
            (!iconTone || iconTone === 'muted') && 'bg-muted text-muted-foreground',
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-semibold leading-8 tracking-tight tabular-nums">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {chip}
        </span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            fillTone === 'default' && 'bg-foreground',
            fillTone === 'slate' && 'bg-muted-foreground',
            fillTone === 'amber' && 'bg-amber-500',
            fillTone === 'positive' && 'bg-positive',
          )}
          style={{ width: `${Math.max(0, Math.min(100, fillPct))}%` }}
        />
      </div>
    </div>
  )
}

export function CategoryMetrics({ categories }: { categories: Category[] }) {
  const total = categories.length
  const fixed = categories.filter((c) => c.default_type === 'fixed').length
  const variable = total - fixed
  const system = categories.filter((c) => c.is_default).length
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Entities"
        icon={<Folders className="h-4 w-4" />}
        value={total}
        unit="Categories"
        chip="Active"
        fillPct={100}
        fillTone="default"
      />
      <MetricCard
        label="Fixed Overhead"
        icon={<LockKeyhole className="h-4 w-4" />}
        value={fixed}
        unit="Categories"
        chip={`${pct(fixed).toFixed(1)}%`}
        fillPct={pct(fixed)}
        fillTone="slate"
      />
      <MetricCard
        label="Variable Flow"
        icon={<SlidersHorizontal className="h-4 w-4" />}
        iconTone="amber"
        value={variable}
        unit="Categories"
        chip={`${pct(variable).toFixed(1)}%`}
        fillPct={pct(variable)}
        fillTone="amber"
      />
      <MetricCard
        label="System Locked"
        icon={<BadgeCheck className="h-4 w-4" />}
        iconTone="positive"
        value={system}
        unit="Protected"
        chip={`${pct(system).toFixed(1)}%`}
        fillPct={pct(system)}
        fillTone="positive"
      />
    </section>
  )
}
