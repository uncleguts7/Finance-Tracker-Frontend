import type { Month } from '@/lib/types'
import { formatDate, formatMonthLabel } from '@/lib/utils'

interface SkippedMonthViewProps {
  month: Month
  skippedAt?: string | null
}

export function SkippedMonthView({ month, skippedAt }: SkippedMonthViewProps) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
      <div className="flex items-center justify-center gap-3">
        <h1 className="text-xl font-semibold text-neutral-500">
          {formatMonthLabel(month.year, month.month_number)}
        </h1>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
          Skipped
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        This month was intentionally skipped
        {skippedAt ? ` on ${formatDate(skippedAt)}` : ''}.
      </p>
    </section>
  )
}