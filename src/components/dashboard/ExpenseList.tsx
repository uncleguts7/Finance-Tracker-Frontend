import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ExpenseFormModal } from '@/components/expenses/ExpenseFormModal'
import { api } from '@/lib/api'
import type { Category, Expense } from '@/lib/types'
import { formatCurrency, toNumber } from '@/lib/utils'

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
  // Modal state: `editing` is undefined when closed, null = add mode, Expense = edit mode.
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined)
  const [filter, setFilter] = useState('')

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
    deleteMutation.mutate(pendingDelete.id, {
      onSettled: () => setPendingDelete(null),
    })
  }

  function categoryName(expense: Expense): string {
    return categoryNameById.get(expense.category_id) ?? 'Deleted category'
  }

  const query = filter.trim().toLowerCase()
  const visible = (expenses ?? []).filter(
    (e) =>
      query === '' ||
      categoryName(e).toLowerCase().includes(query) ||
      e.type.includes(query) ||
      e.date.includes(query) ||
      String(toNumber(e.amount)).includes(query),
  )

  const visibleTotal = visible.reduce((sum, e) => sum + toNumber(e.amount), 0)

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Expenses</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recorded outflows for active cycle
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter ledger..."
              aria-label="Filter expenses"
              className="h-9 w-36 rounded-lg bg-secondary pl-8 pr-2 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus:bg-accent focus:outline-none sm:w-48"
            />
          </div>
          <Button
            className="h-9 gap-1 rounded-lg px-3 text-[13px]"
            onClick={() => setEditing(null)}
          >
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    categoryName={categoryName(expense)}
                    onEdit={setEditing}
                    onDelete={setPendingDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 px-5">
            <span className="text-xs text-muted-foreground">
              Showing {visible.length} recorded line item{visible.length !== 1 ? 's' : ''}
            </span>
            <span className="text-sm tabular-nums">
              <span className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total:
              </span>
              <strong className="font-semibold">{formatCurrency(visibleTotal)}</strong>
            </span>
          </div>
        </>
      ) : expenses && expenses.length > 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No expenses match “{filter}”.
        </p>
      ) : (
        <EmptyState
          title="No expenses yet."
          ctaLabel="Add your first expense"
          onCta={() => setEditing(null)}
        />
      )}

      <ExpenseFormModal
        open={editing !== undefined}
        initialData={editing ?? undefined}
        onClose={() => setEditing(undefined)}
      />

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
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}
