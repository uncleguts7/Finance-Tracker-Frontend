import type { Month } from '@/lib/types'
import { formatDate, formatMonthLabel } from '@/lib/utils'

interface SkippedMonthViewProps {
  month: Month
  skippedAt?: string | null
}

export function SkippedMonthView({ month, skippedAt }: SkippedMonthViewProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="flex items-center justify-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-muted-foreground">
          {formatMonthLabel(month.year, month.month_number)}
        </h1>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Skipped
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        This month was intentionally skipped
        {skippedAt ? ` on ${formatDate(skippedAt)}` : ''}.
      </p>
    </section>
  )
}