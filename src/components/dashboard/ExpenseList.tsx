import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { Category, Expense } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

import { EmptyState } from './EmptyState'
import { ExpenseRow } from './ExpenseRow'

interface ExpenseListProps {
  expenses: Expense[] | undefined
  categories: Category[] | undefined
  monthId: number
}

export function ExpenseList({ expenses, categories, monthId }: ExpenseListProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null)

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of categories ?? []) map.set(c.id, c.name)
    return map
  }, [categories])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteExpense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['summary', monthId] })
      void queryClient.invalidateQueries({ queryKey: ['expenses', monthId] })
      toast({ title: 'Expense deleted' })
    },
    onError: () => {
      toast({ title: 'Failed to delete expense', variant: 'destructive' })
    },
  })

  function confirmDelete() {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id)
    setPendingDelete(null)
  }

  function categoryName(expense: Expense): string {
    return categoryNameById.get(expense.category_id) ?? 'Deleted category'
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 sm:px-6">
        <h2 className="text-lg font-semibold text-neutral-900">Expenses</h2>
        <Button asChild size="sm">
          <Link to="/expenses/new">Add expense</Link>
        </Button>
      </div>

      {expenses && expenses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categoryName={categoryName(expense)}
                  onDelete={setPendingDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No expenses yet." ctaLabel="Add your first expense" ctaHref="/expenses/new" />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete expense?"
        description={
          pendingDelete ? (
            <>
              Delete <strong>{formatCurrency(pendingDelete.amount)}</strong> —{' '}
              {categoryName(pendingDelete)}? This can&apos;t be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}