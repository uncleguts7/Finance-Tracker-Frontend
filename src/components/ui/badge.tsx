import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = {
  default: 'bg-neutral-100 text-neutral-700',
  fixed: 'bg-blue-100 text-blue-700',
  variable: 'bg-amber-100 text-amber-700',
  destructive: 'bg-red-100 text-red-700',
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  )
}