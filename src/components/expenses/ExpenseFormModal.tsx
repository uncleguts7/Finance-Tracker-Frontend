import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

import type { Expense } from '@/lib/types'

import { ExpenseForm } from './ExpenseForm'

interface ExpenseFormModalProps {
  open: boolean
  /** Present = edit mode; undefined = add mode. */
  initialData?: Expense
  onClose: () => void
}

/**
 * Add/Edit expense as an in-page overlay (Stitch "Obsidian Ledger" modal):
 * centered rounded-xl sheet over a blurred, dimmed scrim. Uses a native
 * <dialog> so the page stays visible behind it and Esc focus is handled.
 */
export function ExpenseFormModal({ open, initialData, onClose }: ExpenseFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      aria-labelledby="expense-modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-8 text-card-foreground shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)] backdrop:bg-[rgba(15,23,42,0.3)] backdrop:backdrop-blur-[8px]"
    >
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6">
        <h2 id="expense-modal-title" className="text-2xl font-semibold tracking-tight">
          {initialData ? 'Edit expense' : 'Add expense'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {initialData ? 'Update the expense details.' : 'Record a new expense for this month.'}
        </p>
      </div>

      <ExpenseForm initialData={initialData} onSuccess={onClose} />
    </dialog>
  )
}
