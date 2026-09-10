import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { useToast } from '@/components/ui/toast'
import { api, ApiError } from '@/lib/api'

export function ExpenseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEdit = id != null

  const expenseId = Number(id)
  const expenseQuery = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => api.getExpense(expenseId),
    enabled: isEdit && Number.isInteger(expenseId) && expenseId > 0,
  })

  // Edit mode: 404 → toast + back to dashboard (§8). Other errors handled by the form.
  useEffect(() => {
    if (expenseQuery.isError && expenseQuery.error instanceof ApiError && expenseQuery.error.status === 404) {
      toast({ title: 'Expense not found', variant: 'destructive' })
      navigate('/', { replace: true })
    }
  }, [expenseQuery.isError, expenseQuery.error, navigate, toast])

  if (isEdit && expenseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-center py-12">
          <span
            className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"
            role="status"
            aria-label="Loading"
          />
        </div>
      </div>
    )
  }

  if (isEdit && (expenseQuery.isError || !expenseQuery.data)) {
    // The 404 effect navigates away; render nothing to avoid a flash.
    return null
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-neutral-900">
        {isEdit ? 'Edit expense' : 'Add expense'}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {isEdit ? 'Update the expense details.' : 'Record a new expense for this month.'}
      </p>
      <div className="mt-6">
        <ExpenseForm initialData={expenseQuery.data} onSuccess={() => navigate('/')} />
      </div>
    </div>
  )
}