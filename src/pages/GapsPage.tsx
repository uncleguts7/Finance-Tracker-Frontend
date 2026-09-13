import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useGaps, useBackfillGap, useSkipGap, gapBackfillSchema } from '@/hooks/useGaps'
import { applyServerErrors } from '@/lib/formErrors'
import { useToast } from '@/components/ui/toast'
import type { Gap, GapBackfillInput } from '@/lib/types'

// ============================================================================
// Backfill Modal
// ============================================================================

interface BackfillModalProps {
  gap: Gap | null
  open: boolean
  onClose: () => void
}

export function BackfillModal({ gap, open, onClose }: BackfillModalProps) {
  const { toast } = useToast()
  const backfillMutation = useBackfillGap({
    onSuccess: () => {
      onClose()
    },
  })

  const form = useForm<GapBackfillInput>({
    resolver: zodResolver(gapBackfillSchema),
    defaultValues: {
      year: gap?.year ?? 0,
      month_number: gap?.month_number ?? 0,
      income: 0,
      savings_goal: 0,
    },
  })

  const onSubmit = (data: GapBackfillInput) => {
    backfillMutation.mutate(data, {
      onError: (error) => {
        if (error instanceof Error && 'isValidationError' in error && (error as any).isValidationError()) {
          applyServerErrors(error, form.setError)
          toast({ title: 'Please fix the errors above', variant: 'destructive' })
        }
      },
    })
  }

  if (!gap || !open) return null

  return (
    <dialog
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg p-6 shadow-xl"
      open={open}
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Backfill {gap.label}</h2>
        <p className="text-sm text-neutral-500">
          This will create a read-only past month. You cannot add expenses to backfilled months.
        </p>

        <input type="hidden" {...form.register('year')} />
        <input type="hidden" {...form.register('month_number')} />

        <div className="space-y-1.5">
          <Label htmlFor="backfill-income">Monthly income</Label>
          <Input
            id="backfill-income"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            {...form.register('income', { valueAsNumber: true })}
            aria-invalid={!!form.formState.errors.income}
            className={form.formState.errors.income ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {form.formState.errors.income && (
            <p className="text-xs text-red-600" role="alert">{form.formState.errors.income.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="backfill-savings">Savings goal</Label>
          <Input
            id="backfill-savings"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            {...form.register('savings_goal', { valueAsNumber: true })}
            aria-invalid={!!form.formState.errors.savings_goal}
            className={form.formState.errors.savings_goal ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {form.formState.errors.savings_goal && (
            <p className="text-xs text-red-600" role="alert">{form.formState.errors.savings_goal.message}</p>
          )}
        </div>

        {form.formState.errors.root && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={backfillMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={backfillMutation.isPending}>
            {backfillMutation.isPending ? 'Backfilling…' : 'Backfill'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}

// ============================================================================
// Skip Confirm Dialog (Two-Step)
// ============================================================================

interface SkipConfirmDialogProps {
  gap: Gap | null
  open: boolean
  onClose: () => void
  onConfirmOpen: () => void
}

export function SkipConfirmDialog({ gap, open, onClose, onConfirmOpen }: SkipConfirmDialogProps) {
  if (!gap || !open) return null

  return (
    <ConfirmDialog
      open={open}
      title={`Really skip ${gap.label}?`}
      description={
        <>
          <p className="mt-2">This is permanent — no un-skip, no backfill later.</p>
          <p className="mt-2">Income, savings, and all spending will show as null.</p>
        </>
      }
      confirmLabel="Yes, skip permanently"
      cancelLabel="Cancel"
      destructive
      onConfirm={onConfirmOpen}
      onCancel={onClose}
    />
  )
}

interface SkipFinalConfirmDialogProps {
  gap: Gap | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SkipFinalConfirmDialog({ gap, open, onClose, onConfirm }: SkipFinalConfirmDialogProps) {
  const skipMutation = useSkipGap({
    onSuccess: () => {
      onClose()
      onConfirm()
    },
  })

  if (!gap || !open) return null

  return (
    <ConfirmDialog
      open={open}
      title={`Confirm: Skip ${gap.label} permanently?`}
      description={
        <>
          <p className="mt-2 font-medium text-red-600">This action cannot be undone.</p>
          <p className="mt-2">
            {gap.label} will be marked as intentionally skipped. All summary fields (income, savings, spending)
            will be null. There is no way to restore or edit this month later.
          </p>
        </>
      }
      confirmLabel="Yes, skip permanently"
      cancelLabel="Go back"
      destructive
      onConfirm={() => skipMutation.mutate({ year: gap.year, month_number: gap.month_number })}
      onCancel={onClose}
    />
  )
}

// ============================================================================
// Gap List Row
// ============================================================================

interface GapRowProps {
  gap: Gap
  onBackfill: (gap: Gap) => void
  onSkip: (gap: Gap) => void
  disabled: boolean
}

function GapRow({ gap, onBackfill, onSkip, disabled }: GapRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 py-4">
      <span className="font-medium text-neutral-900">{gap.label}</span>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onBackfill(gap)} disabled={disabled}>
          Backfill
        </Button>
        <Button size="sm" variant="outline" onClick={() => onSkip(gap)} disabled={disabled}>
          Skip
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Gap List
// ============================================================================

interface GapListProps {
  gaps: Gap[]
}

export function GapList({ gaps }: GapListProps) {
  const [backfillGap, setBackfillGap] = useState<Gap | null>(null)
  const [skipStep1Gap, setSkipStep1Gap] = useState<Gap | null>(null)
  const [skipStep2Gap, setSkipStep2Gap] = useState<Gap | null>(null)

  function handleBackfill(gap: Gap) {
    setBackfillGap(gap)
  }

  function handleSkipStep1(gap: Gap) {
    setSkipStep1Gap(gap)
  }

  function handleSkipStep2Open() {
    if (skipStep1Gap) {
      setSkipStep2Gap(skipStep1Gap)
      setSkipStep1Gap(null)
    }
  }

  function handleSkipStep2Close() {
    setSkipStep2Gap(null)
  }

  function handleSkipStep2Confirm() {
    // The mutation onSuccess will call this
    handleSkipStep2Close()
  }

  if (gaps.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">No untracked months found.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
          Untracked Months
        </div>
        {gaps.map((gap) => (
          <GapRow
            key={`${gap.year}-${gap.month_number}`}
            gap={gap}
            onBackfill={handleBackfill}
            onSkip={handleSkipStep1}
            disabled={false} // Could track mutation state if needed
          />
        ))}
      </div>

      <BackfillModal gap={backfillGap} open={!!backfillGap} onClose={() => setBackfillGap(null)} />
      <SkipConfirmDialog
        gap={skipStep1Gap}
        open={!!skipStep1Gap}
        onClose={() => setSkipStep1Gap(null)}
        onConfirmOpen={handleSkipStep2Open}
      />
      <SkipFinalConfirmDialog
        gap={skipStep2Gap}
        open={!!skipStep2Gap}
        onClose={handleSkipStep2Close}
        onConfirm={handleSkipStep2Confirm}
      />
    </>
  )
}

// ============================================================================
// Gaps Page
// ============================================================================

export function GapsPage() {
  const { data: gapsData, isLoading, isError, refetch } = useGaps()
  const gaps = gapsData?.gaps ?? []

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-1/4 bg-neutral-100 rounded animate-pulse" />
        <div className="h-32 bg-neutral-100 rounded animate-pulse" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">Failed to load gaps.</p>
        <Button className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Untracked Months</h1>
        <p className="mt-1 text-sm text-neutral-500">
          These months have no data. Choose to backfill or skip each one.
        </p>
      </header>
      <GapList gaps={gaps} />
    </div>
  )
}