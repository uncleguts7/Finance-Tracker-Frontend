import { Button } from '@/components/ui/button'
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown'
import { CategoryBreakdownSkeleton } from '@/components/dashboard/CategoryBreakdownSkeleton'
import { ExpenseList } from '@/components/dashboard/ExpenseList'
import { ExpenseListSkeleton } from '@/components/dashboard/ExpenseListSkeleton'
import { FixedVariableSplit } from '@/components/dashboard/FixedVariableSplit'
import { GapBanner } from '@/components/dashboard/GapBanner'
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
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ExpenseListSkeleton />
          </div>
          <div className="lg:col-span-4">
            <CategoryBreakdownSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Failed to load dashboard.</p>
        <Button className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!activeMonth || !summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No active month found.</p>
      </div>
    )
  }

  // Branch on skipped months (§4) BEFORE any numeric render — null fields would break display.
  if (summary.is_skipped) {
    return <SkippedMonthView month={activeMonth} skippedAt={summary.skipped_at} />
  }

  return (
    <div className="space-y-6">
      <GapBanner />
      <MonthHeader month={activeMonth} />
      <SummaryCards summary={summary} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ExpenseList expenses={expenses} categories={categories} monthId={activeMonth.id} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <CategoryBreakdown summary={summary} />
          <FixedVariableSplit expenses={expenses ?? []} />
        </div>
      </div>
    </div>
  )
}
