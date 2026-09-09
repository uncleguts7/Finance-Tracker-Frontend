import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  ctaLabel?: string
  ctaHref?: string
}

export function EmptyState({ title, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-neutral-500">{title}</p>
      {ctaLabel && ctaHref && (
        <Button asChild>
          <Link to={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  )
}