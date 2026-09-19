import {
  Car,
  Coffee,
  Cross,
  Droplets,
  Flame,
  Pencil,
  Shirt,
  ShoppingCart,
  Tag,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import type { Expense, ExpenseType } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'

interface ExpenseRowProps {
  expense: Expense
  categoryName: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

/** Best-effort category icon by name; falls back to a generic tag. */
function categoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (n.includes('electr')) return Zap
  if (n.includes('gas') || n.includes('fuel')) return Flame
  if (n.includes('water')) return Droplets
  if (n.includes('cloth')) return Shirt
  if (n.includes('coffee') || n.includes('cafe')) return Coffee
  if (n.includes('hospital') || n.includes('health') || n.includes('medic')) return Cross
  if (n.includes('grocer') || n.includes('food')) return ShoppingCart
  if (n.includes('transport') || n.includes('car')) return Car
  return Tag
}

const typeChipStyles: Record<ExpenseType, string> = {
  fixed: 'bg-slate-200/70 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
  variable: 'bg-amber-200/70 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300',
}

export function ExpenseRow({ expense, categoryName, onEdit, onDelete }: ExpenseRowProps) {
  const Icon = categoryIcon(categoryName)

  return (
    <tr className="group transition-colors duration-100 hover:bg-secondary/60">
      <td className="whitespace-nowrap px-5 py-2 text-sm tabular-nums">{expense.date}</td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {categoryName}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            typeChipStyles[expense.type],
          )}
        >
          {expense.type === 'fixed' ? 'Fixed' : 'Variable'}
        </span>
      </td>
      <td className="whitespace-nowrap px-5 py-2 text-right text-sm font-medium tabular-nums">
        {formatCurrency(expense.amount)}
      </td>
      <td className="whitespace-nowrap px-5 py-2 text-right">
        <div className="inline-flex items-center gap-1 text-muted-foreground opacity-80 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            title="Edit expense"
            aria-label={`Edit ${categoryName} expense`}
            onClick={() => onEdit(expense)}
            className="rounded p-1 transition-colors hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete expense"
            aria-label={`Delete ${categoryName} expense`}
            onClick={() => onDelete(expense)}
            className="rounded p-1 transition-colors hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
