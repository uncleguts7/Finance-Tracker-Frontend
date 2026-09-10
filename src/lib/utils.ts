import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { Money } from './types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
})

/** Coerce a backend money value (string or number) to a number for display math. */
export function toNumber(value: Money | null | undefined): number {
  if (value == null) return 0
  return typeof value === 'number' ? value : Number(value)
}

/** Format a money value for display. Null/undefined render as an em-dash (skipped months). */
export function formatCurrency(value: Money | null | undefined): string {
  if (value == null) return '—'
  return currencyFormatter.format(toNumber(value))
}

/** "September 2026" from year/month_number (both string- and number-tolerant). */
export function formatMonthLabel(year: number | string, monthNumber: number | string): string {
  const date = new Date(Number(year), Number(monthNumber) - 1, 1)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

/**
 * Local date string (YYYY-MM-DD) for today. Uses local getters, NOT
 * `toISOString().split('T')[0]`, which returns the UTC date and shifts to the
 * previous calendar day for timezones ahead of UTC during local midnight hours.
 */
export function todayISO(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Human-readable date for an ISO timestamp (e.g. `skipped_at`). Falls back to the raw value. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

/** Deterministic hash of a string → consistent HSL color for category bars (§7). */
function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

export function categoryColor(name: string): string {
  const hue = hashString(name) % 360
  return `hsl(${hue} 60% 45%)`
}