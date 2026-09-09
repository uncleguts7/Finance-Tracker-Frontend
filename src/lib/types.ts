// Domain types mirroring the backend resource shapes (Backend-System-design.md §6).
// Monetary fields are decimal(10,2) but the backend serializes them inconsistently:
// some endpoints return strings ("5000.00"), others raw numbers (2249.5, 0).
// We model the union so the UI is resilient to both (§5.1, §13.4).

export type Money = string | number

export type ExpenseType = 'fixed' | 'variable'

export interface Month {
  id: number
  year: number | string
  month_number: number | string
  income: Money
  savings_goal: Money
  is_active: boolean
  is_skipped: boolean
  skipped_at: string | null
  created_at: string
  updated_at: string
}

export interface CategorySpending {
  category_name: string
  total: Money
}

/**
 * Normal month (§6.3.1): numeric fields present, no `is_skipped`/`skipped_at` keys.
 * Skipped month (§6.3.2): numeric fields `null`, `spending_by_category` `[]`, plus
 * `is_skipped: true` and `skipped_at` keys.
 */
export interface MonthSummary {
  income: Money | null
  savings_goal: Money | null
  total_spent: Money | null
  remaining: Money | null
  available_to_spend: Money | null
  is_overspent: boolean | null
  spending_by_category: CategorySpending[]
  is_skipped?: boolean
  skipped_at?: string | null
}

export interface Category {
  id: number
  name: string
  default_type: ExpenseType
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Expense {
  id: number
  amount: string
  date: string
  type: ExpenseType
  category_id: number
  month_id: number
  created_at: string
  updated_at: string
}