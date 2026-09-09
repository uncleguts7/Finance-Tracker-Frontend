import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

/**
 * Single source-of-truth hook for the Month Dashboard (MONTH_DASHBOARD_FEATURE_DESIGN.md §2).
 *
 * - `['months']` → find the active month (auto-created by backend middleware §8).
 * - `['summary', activeMonthId]` → answers all 4 core questions in one request (§10).
 * - `['expenses', activeMonthId]` → expense list table (§7.4).
 * - `['categories']` → category name lookup for the expense list (§6).
 */
export function useMonthDashboard() {
  const monthsQuery = useQuery({ queryKey: ['months'], queryFn: api.getMonths })
  const activeMonth = monthsQuery.data?.find((m) => m.is_active)
  const activeMonthId = activeMonth?.id

  const summaryQuery = useQuery({
    queryKey: ['summary', activeMonthId],
    queryFn: () => api.getMonthSummary(activeMonthId!),
    enabled: activeMonthId != null,
  })

  const expensesQuery = useQuery({
    queryKey: ['expenses', activeMonthId],
    queryFn: () => api.getExpenses(activeMonthId!),
    enabled: activeMonthId != null,
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.getCategories })

  const isLoading =
    monthsQuery.isLoading ||
    (activeMonthId != null && (summaryQuery.isLoading || expensesQuery.isLoading)) ||
    categoriesQuery.isLoading

  const isError =
    monthsQuery.isError ||
    summaryQuery.isError ||
    expensesQuery.isError ||
    categoriesQuery.isError

  const refetch = () => {
    void monthsQuery.refetch()
    if (activeMonthId != null) {
      void summaryQuery.refetch()
      void expensesQuery.refetch()
    }
    void categoriesQuery.refetch()
  }

  return {
    activeMonth,
    activeMonthId,
    summary: summaryQuery.data,
    expenses: expensesQuery.data,
    categories: categoriesQuery.data,
    isLoading,
    isError,
    refetch,
  }
}