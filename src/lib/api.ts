import { clearToken, getToken, type User } from './auth'
import type { Category, Expense, ExpenseType, GapsResponse, Month, MonthSummary } from './types'

export interface AuthResponse extends User {
  token: string
}

interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super((body as ApiErrorBody | null)?.message ?? 'Unknown error')
    this.name = 'ApiError'
  }

  isValidationError(): boolean {
    return (
      this.status === 422 &&
      typeof this.body === 'object' &&
      this.body !== null &&
      'errors' in this.body
    )
  }

  getValidationErrors(): Record<string, string[]> {
    if (!this.isValidationError()) return {}
    return (this.body as ApiErrorBody).errors ?? {}
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(
  /\/+$/,
  '',
)

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) throw new ApiError(res.status, json)

  // Backend wraps most resources in `data` (§2.3); `gaps` and `message` are exceptions.
  if ('data' in json) return json.data as T
  if ('gaps' in json) return json.gaps as T
  if ('message' in json) return json.message as T
  return json as T
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && token) {
    // Session expired on an authenticated request → clear + redirect (single location).
    clearToken()
    unauthorizedHandler?.()
  }

  return handleResponse<T>(res)
}

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface ExpensePayload {
  amount: number
  date?: string // optional; defaults to today server-side
  type: ExpenseType
  category_id: number
}

// Auth endpoints only — later features add months/expenses/categories/gaps here.
export const api = {
  login: (payload: LoginPayload) => request<AuthResponse>('POST', '/login', payload),
  register: (payload: RegisterPayload) =>
    request<AuthResponse>('POST', '/register', payload),
  logout: () => request<string>('POST', '/logout'),
  getUser: () => request<User>('GET', '/user'),
  updateUser: (payload: { name: string }) => request<User>('PUT', '/user', payload),
  changePassword: (payload: {
    current_password: string
    password: string
    password_confirmation: string
  }) => request<AuthResponse>('PUT', '/user/password', payload),

  // Months (§7.2)
  getMonths: () => request<Month[]>('GET', '/months'),
  getMonthSummary: (id: number) => request<MonthSummary>('GET', `/months/${id}/summary`),
  updateMonth: (id: number, payload: { income: number; savings_goal: number }) =>
    request<Month>('PUT', `/months/${id}`, payload),

  // Categories (§7.3)
  getCategories: () => request<Category[]>('GET', '/categories'),
  createCategory: (payload: { name: string; default_type: ExpenseType }) =>
    request<Category>('POST', '/categories', payload),
  updateCategory: (id: number, payload: { name: string; default_type: ExpenseType }) =>
    request<Category>('PUT', `/categories/${id}`, payload),
  deleteCategory: (id: number) => request<string>('DELETE', `/categories/${id}`),

  // Expenses (§7.4)
  getExpenses: (monthId: number) => request<Expense[]>('GET', `/months/${monthId}/expenses`),
  getExpense: (id: number) => request<Expense>('GET', `/expenses/${id}`),
  createExpense: (monthId: number, payload: ExpensePayload) =>
    request<Expense>('POST', `/months/${monthId}/expenses`, payload),
  updateExpense: (id: number, payload: ExpensePayload) =>
    request<Expense>('PUT', `/expenses/${id}`, payload),
  deleteExpense: (id: number) => request<string>('DELETE', `/expenses/${id}`),

  // Gaps (§7.5)
  getGaps: () => request<GapsResponse>('GET', '/gaps'),
  backfillGap: (payload: { year: number; month_number: number; income: number; savings_goal: number }) =>
    request<Month>('POST', '/gaps/backfill', payload),
  skipGap: (payload: { year: number; month_number: number }) =>
    request<Month>('POST', '/gaps/skip', payload),
}