import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { TriangleAlert, Trash2 } from 'lucide-react'

import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  /** Whether a confirm action is currently pending (shows spinner). */
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible confirm dialog built on the native `<dialog>` element.
 * `showModal()` provides focus trapping, inert background and Esc handling for free.
 * Styled per the Stitch "Delete" reference: icon + title row, indented body,
 * ghost cancel + destructive confirm, blurred dim backdrop.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[420px] rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl backdrop:bg-[rgba(15,23,42,0.35)] backdrop:backdrop-blur-[3px]"
    >
      <div className="flex items-center gap-3">
        {destructive && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="h-5 w-5" />
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {description && (
        <div className={destructive ? 'mt-2 pl-12 text-sm text-muted-foreground' : 'mt-2 text-sm text-muted-foreground'}>
          {description}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          className="shadow-none"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          ) : (
            destructive && <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
