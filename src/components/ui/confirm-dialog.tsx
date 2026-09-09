import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible confirm dialog built on the native `<dialog>` element.
 * `showModal()` provides focus trapping, inert background and Esc handling for free.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg p-6 shadow-xl"
    >
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {description && <div className="mt-2 text-sm text-neutral-500">{description}</div>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}