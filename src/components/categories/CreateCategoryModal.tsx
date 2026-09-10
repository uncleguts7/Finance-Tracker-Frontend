import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { api, ApiError } from '@/lib/api'
import { applyServerErrors } from '@/lib/formErrors'
import { categorySchema, type CategoryInput } from '@/lib/schemas'
import { cn } from '@/lib/utils'

const selectClasses =
  'h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

interface CreateCategoryModalProps {
  open: boolean
  onClose: () => void
}

export function CreateCategoryModal({ open, onClose }: CreateCategoryModalProps) {
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

  useEffect(() => {
    if (open) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal()
      form.reset({ name: '', default_type: 'variable' })
    } else if (dialogRef.current?.open) {
      dialogRef.current.close()
    }
  }, [open, form])

  const createMutation = useMutation({
    mutationFn: (data: CategoryInput) => api.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Category created' })
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
    createMutation.mutate(values)
  })

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">New Category</h2>

        {formError && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g. Groceries"
            autoFocus
            aria-invalid={!!form.formState.errors.name}
            className={cn(form.formState.errors.name && 'border-red-500 focus-visible:ring-red-500')}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="default_type">Default Type</Label>
          <select
            id="default_type"
            aria-invalid={!!form.formState.errors.default_type}
            className={cn(selectClasses, form.formState.errors.default_type && 'border-red-500 focus-visible:ring-red-500')}
            {...form.register('default_type')}
          >
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
          {form.formState.errors.default_type && (
            <p className="text-sm text-red-600">{form.formState.errors.default_type.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} aria-busy={createMutation.isPending}>
            {createMutation.isPending && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}