import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import type { Expense, ExpenseType } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

interface ExpenseRowProps {
  expense: Expense
  categoryName: string
  onDelete: (expense: Expense) => void
}

const typeBadgeStyles: Record<ExpenseType, string> = {
  fixed: 'bg-blue-100 text-blue-700',
  variable: 'bg-amber-100 text-amber-700',
}

export function ExpenseRow({ expense, categoryName, onDelete }: ExpenseRowProps) {
  return (
    <tr className="border-t border-neutral-200">
      <td className="px-4 py-3 text-sm text-neutral-700">{expense.date}</td>
      <td className="px-4 py-3 text-sm text-neutral-700">{categoryName}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            typeBadgeStyles[expense.type],
          )}
        >
          {expense.type}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm text-neutral-900">
        {formatCurrency(expense.amount)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/expenses/${expense.id}/edit`}>Edit</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDelete(expense)}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  )
}