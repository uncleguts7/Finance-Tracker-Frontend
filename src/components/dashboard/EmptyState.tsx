import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ title, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">{title}</p>
      {ctaLabel && onCta && <Button onClick={onCta}>{ctaLabel}</Button>}
    </div>
  )
}
