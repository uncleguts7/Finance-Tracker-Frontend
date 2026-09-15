import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { api, ApiError } from '@/lib/api'
import { applyServerErrors } from '@/lib/formErrors'
import { createExpenseSchema, type ExpenseInput } from '@/lib/schemas'
import type { Category, Expense } from '@/lib/types'
import { cn, todayISO } from '@/lib/utils'

const LAST_CATEGORY_KEY = 'lastExpenseCategoryId'

const selectClasses =
  'h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const ADD_CATEGORY_OPTION_VALUE = -1

interface ExpenseFormProps {
  initialData?: Expense // undefined = create mode
  onSuccess: () => void // navigate away (Save) — reset handled internally for "add another"
}

type SubmitIntent = 'save' | 'add-another'

export function ExpenseForm({ initialData, onSuccess }: ExpenseFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  })

  // Active month id is only needed for create (POST /months/{monthId}/expenses).
  const { data: months } = useQuery({
    queryKey: ['months'],
    queryFn: api.getMonths,
    enabled: !initialData,
  })
  const activeMonthId = months?.find((m) => m.is_active)?.id

  // Latest categories captured in a ref so the resolver re-validates against the
  // freshly loaded list on every submit without remounting the form.
  const categoriesRef = useRef<Category[]>([])
  categoriesRef.current = categories ?? []

  const resolver = useCallback<Resolver<ExpenseInput>>(
    (values, context, options) =>
      zodResolver(createExpenseSchema(categoriesRef.current))(values, context, options),
    [],
  )

  const form = useForm<ExpenseInput>({
    resolver,
    defaultValues: {
      amount: initialData ? Number(initialData.amount) : ('' as unknown as number),
      date: initialData?.date ?? todayISO(),
      type: initialData?.type ?? 'variable',
      // 0 = "no selection" placeholder; resolved to a real category once loaded.
      category_id: initialData?.category_id ?? 0,
    },
  })

  const formError = form.formState.errors.root?.message

  // State for Create Category modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  // Track the category ID before opening modal to detect new category after creation
  const categoriesBeforeCreateRef = useRef<Category[]>([])
  // Track if we're in the process of creating a category (to avoid interfering with normal category changes)
  const isCreatingCategoryRef = useRef(false)
  // Store the previously selected category ID when opening "+ Add Category"
  const previousCategoryIdRef = useRef<number>(0)

  // Create mode default category: last-used (if it still exists) → first category.
  useEffect(() => {
    if (initialData || !categories?.length) return
    if (form.getValues('category_id')) return
    const last = Number(localStorage.getItem(LAST_CATEGORY_KEY))
    const preferred = categories.find((c) => c.id === last)
    const initialCategory = preferred ?? categories[0]
    form.setValue('category_id', initialCategory.id)
    // Set initial type based on category's default_type
    form.setValue('type', initialCategory.default_type)
  }, [categories, initialData, form])

  // Single watch effect for category changes: handles "+ Add Category" and type sync
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name !== 'category_id') return
      const categoryId = value.category_id ?? 0

      // Handle "+ Add Category" selection
      if (categoryId === ADD_CATEGORY_OPTION_VALUE) {
        categoriesBeforeCreateRef.current = categories ?? []
        isCreatingCategoryRef.current = true
        setIsCreateModalOpen(true)
        return
      }

      // Sync type field when a real category is selected (not during category creation flow)
      if (!categoryId || isCreatingCategoryRef.current) return

      const selectedCategory = categories?.find((c) => c.id === categoryId)
      if (selectedCategory) {
        const newType = selectedCategory.default_type
        form.setValue('type', newType)
        // Remember this valid category for potential cancel restoration
        previousCategoryIdRef.current = categoryId
      }
    })
    return () => subscription.unsubscribe()
  }, [form, categories])

  // Handle successful category creation: auto-select new category and apply type rules
  const handleCategoryCreated = useCallback(
    (newCategory: Category) => {
      isCreatingCategoryRef.current = false
      // The categories query will be invalidated and refetch; we need to wait for the new list
      // But we can optimistically set the category and type now
      form.setValue('category_id', newCategory.id)
      form.setValue('type', newCategory.default_type)
      // Also update localStorage for "last used category"
      localStorage.setItem(LAST_CATEGORY_KEY, String(newCategory.id))
    },
    [form],
  )

  // Reset creating flag when modal closes without creation (cancel)
  const handleCreateModalClose = useCallback(() => {
    isCreatingCategoryRef.current = false
    setIsCreateModalOpen(false)
    // Restore category selection to the previously selected category, or fallback to last-used/first
    const currentCategoryId = form.getValues('category_id')
    if (currentCategoryId === ADD_CATEGORY_OPTION_VALUE || currentCategoryId === 0) {
      const previousId = previousCategoryIdRef.current
      const previousCategory = previousId ? categories?.find((c) => c.id === previousId) : null
      const last = Number(localStorage.getItem(LAST_CATEGORY_KEY))
      const lastUsedCategory = categories?.find((c) => c.id === last)
      const fallbackId = previousCategory?.id ?? lastUsedCategory?.id ?? categories?.[0]?.id ?? 0
      form.setValue('category_id', fallbackId)
    }
  }, [form, categories])

  function handleError(error: unknown): void {
    if (!(error instanceof ApiError)) return
    applyServerErrors(error, form.setError)
    // Toast blocking (non-field) errors — 403, 404, unexpected server messages.
    const hasFieldErrors =
      error.isValidationError() && Object.keys(error.getValidationErrors()).length > 0
    if (!hasFieldErrors) {
      toast({ title: error.message, variant: 'destructive' })
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: ExpenseInput) => api.createExpense(activeMonthId!, data),
    onSuccess: () => {
      const catId = form.getValues('category_id')
      if (catId) localStorage.setItem(LAST_CATEGORY_KEY, String(catId))
      if (activeMonthId != null) {
        void queryClient.invalidateQueries({ queryKey: ['summary', activeMonthId] })
        void queryClient.invalidateQueries({ queryKey: ['expenses', activeMonthId] })
      }
      if (intentRef.current === 'add-another') {
        // Reset form but keep the last used category
        const currentCatId = form.getValues('category_id')
        const currentCategory = categories?.find((c) => c.id === currentCatId)
        form.reset({
          amount: '' as unknown as number,
          date: todayISO(),
          type: currentCategory?.default_type ?? 'variable',
          category_id: currentCatId,
        })
      } else {
        onSuccess()
      }
    },
    onError: handleError,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExpenseInput }) =>
      api.updateExpense(id, data),
    onSuccess: () => {
      const monthId = initialData?.month_id
      if (monthId != null) {
        void queryClient.invalidateQueries({ queryKey: ['summary', monthId] })
        void queryClient.invalidateQueries({ queryKey: ['expenses', monthId] })
      }
      onSuccess()
    },
    onError: handleError,
  })

  const intentRef = useRef<SubmitIntent>('save')

  const handleSave = form.handleSubmit((values) => {
    intentRef.current = 'save'
    if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  })

  const handleSaveAndAnother = form.handleSubmit((values) => {
    intentRef.current = 'add-another'
    createMutation.mutate(values)
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const submitDisabled = isSubmitting || (!initialData && activeMonthId == null)

  // Determine if type field should be disabled based on selected category
  const selectedCategoryId = form.watch('category_id')
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)
  const isTypeDisabled = selectedCategory?.default_type === 'fixed'

  return (
    <>
      <form onSubmit={handleSave} noValidate className="space-y-4">
        {formError && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            autoFocus
            aria-invalid={!!form.formState.errors.amount}
            className={cn(form.formState.errors.amount && 'border-red-500 focus-visible:ring-red-500')}
            {...form.register('amount', { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            aria-invalid={!!form.formState.errors.date}
            className={cn(form.formState.errors.date && 'border-red-500 focus-visible:ring-red-500')}
            {...form.register('date')}
          />
          {form.formState.errors.date && (
            <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            disabled={isTypeDisabled}
            aria-invalid={!!form.formState.errors.type}
            aria-disabled={isTypeDisabled}
            className={cn(
              selectClasses,
              form.formState.errors.type && 'border-red-500 focus-visible:ring-red-500',
              isTypeDisabled && 'opacity-50 cursor-not-allowed',
            )}
            {...form.register('type')}
          >
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
          {form.formState.errors.type && (
            <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
          )}
          {isTypeDisabled && (
            <p className="text-xs text-neutral-500">Type is determined by the selected category (Fixed)</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            disabled={categoriesLoading}
            aria-invalid={!!form.formState.errors.category_id}
            className={cn(
              selectClasses,
              form.formState.errors.category_id && 'border-red-500 focus-visible:ring-red-500',
            )}
            {...form.register('category_id', { valueAsNumber: true })}
          >
            <option value="">{categoriesLoading ? 'Loading…' : 'Select a category'}</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.default_type})
              </option>
            ))}
            <option value={ADD_CATEGORY_OPTION_VALUE} className="font-medium text-blue-600">
              + Add Category
            </option>
          </select>
          {form.formState.errors.category_id && (
            <p className="text-sm text-red-600">{form.formState.errors.category_id.message}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitDisabled} aria-busy={isSubmitting}>
            {isSubmitting && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
          {!initialData && (
            <Button
              type="button"
              variant="outline"
              disabled={submitDisabled}
              onClick={handleSaveAndAnother}
            >
              Save & add another
            </Button>
          )}
        </div>
      </form>

      <CreateCategoryModal
        open={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onSuccess={handleCategoryCreated}
      />
    </>
  )
}