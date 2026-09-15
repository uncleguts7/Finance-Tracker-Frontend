# Frontend System Design — Personal Finance Tracker

> Source of truth for the frontend implementation. This document reflects the decisions made in the collaborative design session. It references `Backend-System-design.md` by section number rather than re-describing backend behavior. Status: **design complete, not yet built**.

---

## Table of Contents

1. [System Overview & Backend Communication](#1-system-overview--backend-communication)
2. [Page/Route List & Navigation Structure](#2-pageroute-list--navigation-structure)
3. [State Management Approach](#3-state-management-approach)
4. [Component Architecture](#4-component-architecture)
5. [Data Flow for Core User Questions](#5-data-flow-for-core-user-questions)
6. [Form Handling Strategy](#6-form-handling-strategy)
7. [Gap Detection & Backfill/Skip UX Flow (Phase 2)](#7-gap-detection--backfillskip-ux-flow-phase-2)
8. [Auth Flow](#8-auth-flow)
9. [Loading, Error, and Empty States](#9-loading-error-and-empty-states)
10. [Visual Direction](#10-visual-direction)
11. [Out of Scope for Phase 1](#11-out-of-scope-for-phase-1)
12. [Future Migration Notes](#12-future-migration-notes)

---

## 1. System Overview & Backend Communication

### 1.1 Stack

- **Framework:** React 18 + TypeScript (strict mode)
- **Routing:** React Router v6 (client-side SPA)
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives, copy-paste model)
- **Data Fetching:** TanStack Query v5 (React Query)
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Native `fetch` wrapped in a thin API client with interceptors
- **Build Tool:** Vite

### 1.2 Backend Contract Reference

All backend behavior is defined in `Backend-System-design.md`. Key sections the frontend implements against:

| Concern | Backend Doc Section |
|---------|---------------------|
| Base URL, response wrapping, error shapes | §2 |
| Auth endpoints, token format, 401 handling | §3, §7.1 |
| Month endpoints, active-month rule, summary shapes | §7.2, §10, §6.3 |
| Category endpoints, soft-delete behavior | §7.3, §6.4 |
| Expense endpoints, nested routes, active-month writes | §7.4, §6.5 |
| Gap detection, backfill, skip | §7.5, §9 |
| Auto month creation middleware | §8 |
| Validation rules | §11 |
| Error messages & status codes | §12 |
| Edge cases & frontend implications | §13 |
| What is NOT in the backend | §14 |

### 1.3 API Client — Base Configuration

```typescript
// Single source of truth for all API calls
const API_BASE = import.meta.env.VITE_API_BASE_URL; // e.g. "https://api.example.com/api"

// All requests include:
headers: {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`, // via auth abstraction, see §8.3
}
```

### 1.4 Response Handling Pattern

```typescript
// Success: unwrap `data` (or `gaps` for GET /gaps, `message` for logout)
async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, json);
  
  // Backend wraps most resources in `data` (§2.3)
  if ('data' in json) return json.data as T;
  if ('gaps' in json) return json.gaps as T; // GET /gaps exception
  if ('message' in json) return json.message as T; // logout exception
  return json as T;
}

// Error: branch on status code (§2.5, §12)
class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(body?.message ?? 'Unknown error');
  }
  
  isValidationError(): boolean {
    return this.status === 422 && this.body && typeof this.body === 'object' && 'errors' in this.body;
  }
  
  getValidationErrors(): Record<string, string[]> {
    return (this.body as { errors: Record<string, string[]> }).errors ?? {};
  }
}
```

### 1.5 401 Handling — Global Interceptor

Any `401` from any authenticated request → clear local token + redirect to `/login`. Implemented in the API client's response interceptor (single location, not scattered).

---

## 2. Page/Route List & Navigation Structure

### 2.1 Phase 1 Routes (Core Loop)

| Route | Component | Auth Required | Purpose |
|-------|-----------|---------------|---------|
| `/login` | `LoginPage` | No | Email/password form |
| `/register` | `RegisterPage` | No | Name/email/password/confirm |
| `/` | `DashboardPage` | **Yes** | Active month view — income, savings goal, expense list, summary cards, category breakdown |
| `/expenses/new` | `ExpenseFormPage` | **Yes** | Add expense — amount, date, type, category |
| `/expenses/:id/edit` | `ExpenseFormPage` | **Yes** | Edit expense — pre-filled, same fields |
| `/settings` | `SettingsPage` | **Yes** | Logout, account info (minimal) |

### 2.2 Phase 2 Routes (Deferred)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/categories` | `CategoriesPage` | Category CRUD (list, create, edit, delete) |
| `/gaps` | `GapsPage` | Gap resolution screen (reached from dashboard banner) |
| `/months/:id` | `MonthDetailPage` | Past month detail (read-only summary + expense list) |

### 2.3 Navigation Structure

```
<BrowserRouter>
  <AuthProvider>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes — wrapped in <RequireAuth> */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Phase 2 */}
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/gaps" element={<GapsPage />} />
        <Route path="/months/:id" element={<MonthDetailPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

### 2.4 Layout Component

`Layout` provides:
- Top bar: app name, current month label (e.g. "September 2026"), user avatar/menu (logout)
- Sidebar (desktop) / drawer (mobile): navigation links — Dashboard, Settings (+ Categories, Gaps in Phase 2)
- Main content area with `<Outlet />`
- Toast container (shadcn/ui `Toaster`)

---

## 3. State Management Approach

### 3.1 Server State — TanStack Query

**Configuration:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                    // Always refetch on mount (§10.4)
      refetchOnMount: 'always',        // Fresh data on every navigation
      refetchOnWindowFocus: true,      // Refetch when tab regains focus
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false; // Don't retry auth failures
        return failureCount < 3;
      },
    },
  },
});
```

### 3.2 Query Keys (Explicit Mapping)

| Query Key | Endpoint | Invalidation Triggers |
|-----------|----------|----------------------|
| `['user']` | `GET /user` | — (only on login/register/logout) |
| `['months']` | `GET /months` | `PUT /months/{id}`, `POST /gaps/backfill`, `POST /gaps/skip` |
| `['month', monthId]` | `GET /months/{id}` | `PUT /months/{id}` |
| `['summary', monthId]` | `GET /months/{id}/summary` | **Any expense mutation** (`POST/PUT/DELETE /expenses`), `PUT /months/{id}` |
| `['expenses', monthId]` | `GET /months/{monthId}/expenses` | `POST/PUT/DELETE /expenses` under that month |
| `['categories']` | `GET /categories` | `POST/PUT/DELETE /categories` |
| `['gaps']` | `GET /gaps` | `POST /gaps/backfill`, `POST /gaps/skip` |

### 3.3 Invalidation Strategy — Mutation → Query Keys

| Mutation | Invalidated Query Keys | Rationale |
|----------|------------------------|-----------|
| `POST /months/{id}/expenses` | `['summary', monthId]`, `['expenses', monthId]` | New expense changes totals + list |
| `PUT /expenses/{id}` | `['summary', monthId]`, `['expenses', monthId]` | Updated expense changes totals + list |
| `DELETE /expenses/{id}` | `['summary', monthId]`, `['expenses', monthId]` | Deleted expense changes totals + list |
| `PUT /months/{id}` | `['summary', monthId]`, `['month', monthId]`, `['months']` | Income/savings change affects summary + month list |
| `POST /categories` | `['categories']` | New category appears in dropdowns |
| `PUT /categories/{id}` | `['categories']` | Updated category name/type affects dropdowns |
| `DELETE /categories/{id}` | `['categories']` | **NOT** `['summary', ...]` — soft-delete never changes historical totals (§5.4, §10.2) |
| `POST /gaps/backfill` | `['months']`, `['gaps']` | New month row appears in list, gap resolved |
| `POST /gaps/skip` | `['months']`, `['gaps']` | Skipped month appears in list, gap resolved |
| `POST /logout` | **All** (via `queryClient.clear()`) | Full cache clear on logout |

> **Note on `PUT /months/{id}`:** This mutation uses an **optimistic update** (TanStack Query `onMutate` updates `['month', id]` and `['summary', id]` cache immediately, with rollback on error) rather than plain invalidate-after-success. See `MONTH_DASHBOARD_FEATURE_DESIGN.md` §5.

### 3.4 Client State — React Context + `useState`

Minimal client-only state:
- **Auth context:** current user (`id`, `name`, `email`), token (via abstraction), login/logout actions
- **UI state:** sidebar open/closed, modal open/closed, toasts
- **Form ephemeral state:** "last used category ID" persisted to `localStorage` (not query cache)

**No global store (Zustand/Redux).** Server state lives in TanStack Query; client state stays local or in React Context.

---

## 4. Component Architecture

### 4.1 High-Level Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives (copied, not imported as package)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── toast.tsx
│   │   ├── avatar.tsx
│   │   └── dropdown-menu.tsx
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MonthBadge.tsx     # "September 2026 • Active" / "Skipped"
│   ├── dashboard/
│   │   ├── SummaryCards.tsx   # Total Spent, Remaining, Available, Overspent badge
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseRow.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   └── GapBanner.tsx      # Phase 2: dismissible banner + resolve CTA
│   ├── expenses/
│   │   └── ExpenseForm.tsx    # Shared form component (new/edit)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── settings/
│       └── SettingsForm.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ExpenseFormPage.tsx
│   └── SettingsPage.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useMonths.ts
│   ├── useExpenses.ts
│   ├── useCategories.ts
│   └── useGaps.ts
├── lib/
│   ├── api.ts                 # API client + interceptors
│   ├── auth.ts                # Token abstraction (get/set/clear)
│   ├── queryClient.ts
│   ├── schemas.ts             # Zod schemas mirroring backend validation
│   └── utils.ts               # cn(), formatCurrency(), formatDate()
├── contexts/
│   └── AuthContext.tsx
└── routes/
    └── router.tsx
```

### 4.2 shadcn/ui Component List (Phase 1)

| Component | Source | Customization |
|-----------|--------|---------------|
| `Button` | shadcn/ui | Accent color, loading state |
| `Input` | shadcn/ui | Error state styling |
| `Label` | shadcn/ui | — |
| `Select` | shadcn/ui | Category dropdown, type selector |
| `Dialog` | shadcn/ui | Confirm modals (skip, delete expense) |
| `Table` | shadcn/ui | Expense list, category list |
| `Badge` | shadcn/ui | Month status (Active/Skipped), expense type (Fixed/Variable) |
| `Card` | shadcn/ui | Summary cards, form containers |
| `Toast` / `Toaster` | shadcn/ui | Success/error notifications |
| `Avatar` | shadcn/ui | User menu trigger |
| `DropdownMenu` | shadcn/ui | User menu (logout) |

---

## 5. Data Flow for Core User Questions

The backend answers 4 core questions (§1.2). Each traced from UI action → API call → render.

### 5.1 "How much did I spend this month?"

| Step | Detail |
|------|--------|
| UI Action | User lands on `/` (Dashboard) |
| Query | `useQuery({ queryKey: ['summary', activeMonthId], queryFn: () => api.getSummary(activeMonthId) })` |
| API Call | `GET /api/months/{activeMonthId}/summary` |
| Response | `{ total_spent: "2750.00", ... }` (§6.3.1) |
| Render | `SummaryCards` → "Total Spent: $2,750.00" |
| Refresh | Automatic on window focus, or after any expense mutation (invalidation) |

### 5.2 "How much money remains?"

| Step | Detail |
|------|--------|
| Query | Same `['summary', activeMonthId]` query |
| Response | `{ remaining: "2250.00", available_to_spend: "4000.00", ... }` |
| Render | Two cards: "Remaining: $2,250.00" (income − spent) + "Available to Spend: $4,000.00" (income − savings goal) |
| Note | `remaining` can be negative; `available_to_spend` is the budget ceiling |

### 5.3 "What did I spend my money on (by category)?"

| Step | Detail |
|------|--------|
| Query | Same `['summary', activeMonthId]` query |
| Response | `{ spending_by_category: [{ category_name: "Food", total: "1500.00" }, ...] }` |
| Render | `CategoryBreakdown` — horizontal bar chart or sorted list with percentages |
| Note | Includes soft-deleted categories for historical months (§10.2) — backend handles this |

### 5.4 "Did I overspend, based on my savings goal?"

| Step | Detail |
|------|--------|
| Query | Same `['summary', activeMonthId]` query |
| Response | `{ is_overspent: true, available_to_spend: "4000.00", total_spent: "4500.00" }` |
| Render | `SummaryCards` — prominent "Overspent" badge (red) when `is_overspent === true` |
| Logic | `is_overspent = total_spent > available_to_spend` (computed by backend, §10.1) |

### 5.5 Skipped Month Handling (All Questions)

| Step | Detail |
|------|--------|
| Query | `GET /months/{id}/summary` for a skipped month |
| Response | `{ is_skipped: true, skipped_at: "...", income: null, savings_goal: null, total_spent: null, remaining: null, available_to_spend: null, is_overspent: null, spending_by_category: [] }` (§6.3.2) |
| Render | **Branch on `is_skipped === true` before any numeric render** — show "This month was intentionally skipped on [date]" with muted styling, no numeric cards |

---

## 6. Form Handling Strategy

### 6.1 Library Stack

- **React Hook Form** — form state, validation, submission
- **Zod** — schema validation (mirrors backend rules, §11)
- **Integration:** `@hookform/resolvers/zod`

### 6.2 Zod Schemas (Client-Side UX Validation Only)

```typescript
// lib/schemas.ts
export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, {
  message: 'Passwords do not match',
  path: ['password_confirmation'],
});

export const monthUpdateSchema = z.object({
  income: z.number().min(0, 'Income cannot be negative'),
  savings_goal: z.number().min(0, 'Savings goal cannot be negative'),
});

// Factory function — categories come from a runtime query, not module scope
export const createExpenseSchema = (categories: Category[]) =>
  z.object({
    amount: z.number().positive('Amount must be positive').max(999999.99),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
    type: z.enum(['fixed', 'variable']),
    category_id: z.number().int().positive(),
  }).refine(
    (data) => categories.some(c => c.id === data.category_id),
    { message: 'Invalid category', path: ['category_id'] }
  );

// Phase 2
export const gapBackfillSchema = z.object({
  year: z.number().int().min(2000).max(2099),
  month_number: z.number().int().min(1).max(12),
  income: z.number().min(0),
  savings_goal: z.number().min(0),
});

export const gapSkipSchema = z.object({
  year: z.number().int().min(2000).max(2099),
  month_number: z.number().int().min(1).max(12),
});
```

> **Rule:** Zod validates *client-known* constraints only. Server 422 is authoritative (§11, §12.6). The `category_id` refine only checks against the currently loaded `GET /categories` list — it cannot re-implement the server's "exists for user AND not soft-deleted" rule.
>
> **Note:** `expenseSchema` is a factory function (`createExpenseSchema(categories)`) because `categories` comes from a `useQuery` hook at runtime. A static export would either throw `ReferenceError` on import or close over an empty/undefined array.

### 6.3 Server 422 → RHF `setError()` Mapping

```typescript
// In mutation onError / catch block
if (error instanceof ApiError && error.isValidationError()) {
  const errors = error.getValidationErrors();
  Object.entries(errors).forEach(([field, messages]) => {
    form.setError(field as keyof T, { message: messages[0] });
  });
  
  // Non-field errors (e.g., "This month already exists" from gaps)
  if (error.body.message && !errors[error.body.message]) {
    form.setError('root', { message: error.body.message }); // form-level banner
    toast.error(error.body.message);
  }
}
```

**All blocking errors (gap conflicts, stale category, etc.)** show a **form-level banner** + toast — not either/or. Toasts can be missed on mobile.

### 6.4 Expense Form — Two-Button Pattern

| Button | Behavior |
|--------|----------|
| **Save** | Submit → on success, `navigate('/')` |
| **Save & add another** | Submit → on success, `form.reset({ date: todayISO(), type: currentCategory.default_type, category_id: lastUsedCategoryId, amount: '' })` — stays on `/expenses/new` |

- `lastUsedCategoryId` read from `localStorage` (`lastExpenseCategoryId`), updated on every successful expense submit.
- `todayISO()` builds a local date string (not UTC):
```typescript
function todayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
```
- Amount field `autoFocus` on mount.

---

## 7. Gap Detection & Backfill/Skip UX Flow (Phase 2)

### 7.1 Detection & Banner (Dashboard)

- On `DashboardPage` mount: `useQuery({ queryKey: ['gaps'], queryFn: api.getGaps })`
- If `gaps.length > 0`: render `GapBanner` at top of dashboard (below top bar, above summary cards)

**GapBanner UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  You have 2 untracked months: March 2026, April 2026        │
│  [ Resolve ]  [ Dismiss for this session ]                  │
└─────────────────────────────────────────────────────────────┘
```

- **Dismiss** = hide banner until next browser session (no `localStorage` flag). Gaps remain in query cache.
- **Persistent nav indicator**: Sidebar link "Gaps (2)" with badge — always visible, clicking navigates to `/gaps`.
- **Resolve** button → navigate to `/gaps` (dedicated screen).

### 7.2 Gap Resolution Screen (`/gaps`)

- Lists all gaps with `label` (e.g. "March 2026")
- Each gap row: two action buttons — **Backfill** / **Skip**

**Backfill Modal:**
- Pre-fills `year`, `month_number` from gap
- Fields: `income` (number, min 0), `savings_goal` (number, min 0)
- Submit → `POST /gaps/backfill` → invalidates `['months']`, `['gaps']` → banner updates

**Skip Flow (Two-Step Confirm):**

1. Click **Skip** → opens confirm modal:
   ```
   Really skip March 2026?
   This is permanent — no un-skip, no backfill later.
   Income, savings, and all spending will show as null.
   
   [ Cancel ]  [ Yes, skip permanently ]
   ```
2. Confirm → `POST /gaps/skip` → invalidates `['months']`, `['gaps']` → banner updates

> **Deferred Enhancement (Not Phase 2):** Show user's recent average income in the skip confirm modal (e.g. "Your recent average income: $4,800/mo") so "null data" has concrete comparison.

### 7.3 Skipped Month Display (All Phases)

- Month list (`GET /months`): show `is_skipped` badge (muted, "Skipped") next to month label
- Month summary: branch on `is_skipped === true` → render "This month was intentionally skipped on [skipped_at]" — no numeric cards, no expense list
- No "un-skip" or "edit" affordance anywhere

---

## 8. Auth Flow

### 8.1 Token Storage — `localStorage` (Phase 1)

```typescript
// lib/auth.ts — SINGLE abstraction for all token access
const TOKEN_KEY = 'ft_auth_token';
const USER_KEY = 'ft_auth_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
```

> All token read/write goes through this module. No scattered `localStorage.getItem` calls. Future migration to HttpOnly cookies (§12) only touches this file + API client interceptor.

### 8.2 Auth Flow

```
1. Register / Login
   → POST /api/register or /api/login
   → Response: { data: { id, name, email, token } }
   → setToken(token), setUser({ id, name, email })
   → navigate('/')

2. Authenticated Requests
   → API client interceptor attaches Authorization: Bearer <getToken()>

3. 401 Response (any endpoint)
   → API client interceptor catches 401
   → clearToken()
   → navigate('/login', { replace: true })

4. Logout
   → POST /api/logout (with current token)
   → clearToken()
   → navigate('/login', { replace: true })
```

### 8.3 Protected Routes

```tsx
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <Loader />; // checking stored token + GET /user to validate
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}
```

- On app mount: `useAuth` checks `localStorage` for token → if present, calls `GET /user` to validate + hydrate user. If 401, clears token and redirects.

---

## 9. Loading, Error, and Empty States

### 9.1 Consistent Patterns

| State | Pattern | Component |
|-------|---------|-----------|
| **Loading (initial)** | Skeleton loaders matching content shape | `SummaryCardsSkeleton`, `ExpenseListSkeleton`, `CategoryBreakdownSkeleton` |
| **Loading (refetch)** | Keep stale data visible, subtle spinner in corner | TanStack Query `isFetching` + overlay spinner |
| **Error (query)** | Inline error card with "Retry" button | `QueryError` wrapper component |
| **Error (mutation)** | Toast + form-level banner (for forms) / toast only (for deletes) | `toast.error()` + `form.setError('root', ...)` |
| **Empty (expenses)** | "No expenses yet. [Add your first expense]" | `EmptyState` component with CTA button |
| **Empty (categories)** | "No categories yet. [Create one]" (Phase 2) | `EmptyState` |
| **Empty (gaps)** | No banner shown; "Gaps (0)" badge hidden | — |

### 9.2 Skeleton Components

- Each data-driven section has a corresponding skeleton (same layout, gray pulses).
- No layout shift when data arrives — skeletons match final dimensions.

### 9.3 Error Boundaries

- React Error Boundary at route level for uncaught render errors.
- Logs to console (Phase 1) — replace with error reporting service later.

---

## 10. Visual Direction

### 10.1 Color Palette

| Role | Value | Usage |
|------|-------|-------|
| **Accent (Primary)** | `#2563eb` (Blue-600) | Primary buttons, active nav, focus rings, overspent badge (red override) |
| **Accent Hover** | `#1d4ed8` (Blue-700) | Button hover |
| **Success** | `#16a34a` (Green-600) | Positive remaining, "under budget" |
| **Warning** | `#f59e0b` (Amber-500) | Near-budget |
| **Danger** | `#dc2626` (Red-600) | Overspent badge, delete buttons, skip confirm |
| **Background** | `#fafafa` (Neutral-50) | Page background |
| **Surface** | `#ffffff` (White) | Cards, modals, sidebar |
| **Border** | `#e5e5e5` (Neutral-200) | Input borders, table dividers |
| **Text Primary** | `#171717` (Neutral-900) | Headings, body |
| **Text Muted** | `#737373` (Neutral-500) | Labels, helper text, skipped month text |

> **Not default slate/gray.** Blue accent chosen for trust/finance association. Green/Red for budget semantics.

### 10.2 Typography

| Element | Font | Size/Weight |
|---------|------|-------------|
| **UI Font** | `Inter` (via `@fontsource/inter` or Google Fonts) | All UI text |
| **Monospace (numbers)** | `JetBrains Mono` (via `@fontsource/jetbrains-mono`) | Currency amounts, tables |
| **Heading 1** | Inter 600 | 24px / 1.5rem |
| **Heading 2** | Inter 600 | 20px / 1.25rem |
| **Body** | Inter 400 | 16px / 1rem |
| **Small / Label** | Inter 500 | 14px / 0.875rem |

### 10.3 Spacing & Radius Conventions

| Token | Value | Usage |
|-------|-------|-------|
| **Space Unit** | 4px (Tailwind default) | All spacing multiples of 4 |
| **Container Padding** | `px-4 sm:px-6 lg:px-8` | Page horizontal padding |
| **Card Padding** | `p-4 sm:p-6` | Card internals |
| **Gap (stack)** | `space-y-4` | Vertical stacks |
| **Gap (inline)** | `gap-3` | Horizontal groups |
| **Border Radius** | `rounded-lg` (8px) | Cards, buttons, inputs, modals |
| **Border Radius (small)** | `rounded-md` (6px) | Badges, tags |

### 10.4 Component Styling Notes

- **Buttons:** `px-4 py-2` base, `text-sm font-medium`, `rounded-lg`, `transition-colors`
- **Inputs:** `h-10 px-3`, `border border-neutral-300`, `focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- **Error Input:** `border-red-500 focus:ring-red-500`
- **Summary Cards:** `bg-white border border-neutral-200 rounded-lg p-4 sm:p-6`, icon + label + value (monospace)
- **Overspent Badge:** `bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium`
- **Month Badge (Active):** `bg-blue-100 text-blue-700`
- **Month Badge (Skipped):** `bg-neutral-100 text-neutral-500`

---

## 11. Out of Scope for Phase 1

The following are explicitly **not** in Phase 1 (core loop). They belong to Phase 2+:

- Category CRUD UI (`/categories` page, create/edit/delete modals)
- Gap detection banner + resolution screen (`/gaps` page, backfill/skip modals)
- Past month detail page (`/months/:id` — read-only summary + expense list)
- Month-over-month comparison / trends / charts
- Export (CSV, PDF)
- Recurring expenses / templates
- Multi-currency
- Budget alerts / notifications
- Dark mode (default is light; dark mode is a separate Phase 3+ feature)
- Keyboard shortcuts / command palette
- Tests (unit/integration/E2E) — testing strategy decided separately

**Phase 1 delivers:** Auth → Active Month Dashboard → Expense CRUD → Summary (all 4 core questions answered).

---

## 12. Future Migration Notes

### 12.1 HttpOnly Cookie Auth Migration

**When:** Backend adds Sanctum stateful/cookie support + CSRF endpoint + CORS credentials config.

**Hosting Dependency:** Frontend and API **must be same-site** (e.g. `app.example.com` + `api.example.com`) for `SameSite=Lax` cookies to work. Cross-origin (`app.vercel.app` → `api.railway.app`) requires `SameSite=None; Secure` which has stricter browser requirements. **Resolve at deploy time, not after.**

**Changes on Migration Day:**

| Area | Change |
|------|--------|
| Backend | Sanctum `stateful` domains, `sanctum.php` cookie config, CSRF token endpoint, CORS `supports_credentials: true` |
| Frontend `lib/auth.ts` | Remove `getToken`/`setToken`/`clearToken` (no localStorage token) |
| Frontend `lib/api.ts` | Remove `Authorization` header interceptor; add `credentials: 'include'` to all requests; add CSRF token header interceptor (read from cookie or meta tag) |
| Frontend `AuthContext` | Login/register calls no longer return token; `GET /user` becomes the auth check |
| Frontend `logout` | `POST /logout` + redirect (no localStorage clear needed) |

### 12.2 Other Documented Migrations

| Feature | Trigger |
|---------|---------|
| Route-triggered expense modal (revisit Decision 2a) | Real usage friction — "add expense" feels slow/context-switching |
| Dark mode | User request + design system maturity |
| Chart library for category breakdown | `CategoryBreakdown` outgrows simple bars |
| Virtualized expense list | `GET /months/{id}/expenses` returns >200 items |

---

*End of Frontend System Design — ready for feature-doc split.*