import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'destructive'

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'default' }: ToastOptions) => {
      const id = ++nextId
      setToasts((current) => [...current, { id, title, description, variant }])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className={cn(
              'pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-white px-4 py-3 text-left text-sm shadow-lg',
              t.variant === 'destructive' ? 'border-red-200' : 'border-neutral-200',
            )}
          >
            <span className="flex-1">
              <span className="block font-medium text-neutral-900">{t.title}</span>
              {t.description && (
                <span className="mt-0.5 block text-neutral-500">{t.description}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}