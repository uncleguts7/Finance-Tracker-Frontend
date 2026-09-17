import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import type { Category } from '@/lib/types'

interface DeleteConfirmDialogProps {
  open: boolean
  category: Category | null
  onClose: () => void
}

export function DeleteConfirmDialog({ open, category, onClose }: DeleteConfirmDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      // CRITICAL: Only invalidate ['categories'] — NOT ['summary', ...]
      // Soft-delete never changes historical totals (Backend-System-design.md §10.2)
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Category deleted' })
      onClose()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        toast({ title: 'Category not found', variant: 'destructive' })
      } else {
        toast({ title: 'Failed to delete category', variant: 'destructive' })
      }
      onClose()
    },
  })

  useEffect(() => {
    if (open) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal()
    } else if (dialogRef.current?.open) {
      dialogRef.current.close()
    }
  }, [open])

  const handleConfirm = () => {
    if (category) {
      deleteMutation.mutate(category.id)
    }
  }

  if (!category) return null

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">
        Delete "{category.name}"?
      </h2>
      <div className="mt-2 text-sm text-muted-foreground">
        <p>This hides it from future expense selection but preserves all historical data.</p>
        <p className="mt-1">Past months&apos; totals and breakdowns will not change.</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={deleteMutation.isPending}
          aria-busy={deleteMutation.isPending}
        >
          {deleteMutation.isPending && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          )}
          {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </dialog>
  )
}