import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SquarePen, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { api, ApiError } from '@/lib/api'
import { applyServerErrors } from '@/lib/formErrors'
import { categorySchema, type CategoryInput } from '@/lib/schemas'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TypeRadioField } from './CategoryFormFields'

interface EditCategoryModalProps {
  open: boolean
  category: Category | null
  onClose: () => void
}

export function EditCategoryModal({ open, category, onClose }: EditCategoryModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      default_type: 'variable',
    },
  })

  const formError = form.formState.errors.root?.message

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        default_type: category.default_type,
      })
    }
  }, [category, form])

  useEffect(() => {
    if (open) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal()
    } else if (dialogRef.current?.open) {
      dialogRef.current.close()
    }
  }, [open])

  const updateMutation = useMutation({
    mutationFn: (data: CategoryInput) => api.updateCategory(category!.id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Category updated' })
      onClose()
    },
    onError: handleError,
  })

  function handleError(error: unknown): void {
    if (!(error instanceof ApiError)) return
    applyServerErrors(error, form.setError)
    const hasFieldErrors =
      error.isValidationError() && Object.keys(error.getValidationErrors()).length > 0
    if (!hasFieldErrors) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  const handleSubmit = form.handleSubmit((values) => {
    updateMutation.mutate(values)
  })

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/40 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <SquarePen className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold tracking-tight">Edit {category.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        {formError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Category Name</Label>
          <Input
            id="name"
            placeholder="e.g. Broadband, Groceries, Gym"
            autoFocus
            aria-invalid={!!form.formState.errors.name}
            className={cn(
              'bg-muted/50',
              form.formState.errors.name && 'border-destructive focus-visible:ring-destructive',
            )}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Expense Behavior</Label>
          <TypeRadioField control={form.control} />
          <p className="text-xs text-muted-foreground">
            Fixed flows recur invariably each billing cycle.
          </p>
          {form.formState.errors.default_type && (
            <p className="text-sm text-destructive">{form.formState.errors.default_type.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} aria-busy={updateMutation.isPending}>
            {updateMutation.isPending && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {updateMutation.isPending ? 'Saving…' : 'Save Rule'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
