import { Button } from '@/components/ui/button'
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown'
import { CategoryBreakdownSkeleton } from '@/components/dashboard/CategoryBreakdownSkeleton'
import { ExpenseList } from '@/components/dashboard/ExpenseList'
import { ExpenseListSkeleton } from '@/components/dashboard/ExpenseListSkeleton'
import { MonthHeader } from '@/components/dashboard/MonthHeader'
import { SkippedMonthView } from '@/components/dashboard/SkippedMonthView'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { SummaryCardsSkeleton } from '@/components/dashboard/SummaryCardsSkeleton'
import { useMonthDashboard } from '@/hooks/useMonthDashboard'

export function DashboardPage() {
  const { activeMonth, summary, expenses, categories, isLoading, isError, refetch } =
    useMonthDashboard()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SummaryCardsSkeleton />
        <ExpenseListSkeleton />
        <CategoryBreakdownSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">Failed to load dashboard.</p>
        <Button className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!activeMonth || !summary) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">No active month found.</p>
      </div>
    )
  }

  // Branch on skipped months (§4) BEFORE any numeric render — null fields would break display.
  if (summary.is_skipped) {
    return <SkippedMonthView month={activeMonth} skippedAt={summary.skipped_at} />
  }

  return (
    <div className="space-y-6">
      <MonthHeader month={activeMonth} />
      <SummaryCards summary={summary} />
      <ExpenseList expenses={expenses} categories={categories} monthId={activeMonth.id} />
      <CategoryBreakdown summary={summary} />
    </div>
  )
}