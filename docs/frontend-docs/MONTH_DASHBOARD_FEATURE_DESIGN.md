# Month Dashboard Feature Design — Frontend

> Status: **design complete, not yet built**

---

## Problem Statement

The Dashboard (`/`) is the core read surface of the app. It must answer all 4 core user questions for the **active month**:
1. How much did I spend this month?
2. How much money remains?
3. What did I spend my money on (by category)?
4. Did I overspend, based on my savings goal?

It displays: income/savings goal inputs (editable), expense list, summary cards, category breakdown. It must handle loading, error, empty states, and skipped-month display correctly.

Backend contract: `Backend-System-design.md` §6.3 (summary shapes), §7.2 (month endpoints), §8 (auto month creation), §10 (calculated values), §13.1–13.3 (edge cases).

---

## Design

### 1. Page Structure (`DashboardPage.tsx`)

```
<DashboardPage>
  <GapBanner />                    {/* Phase 2: only renders if gaps exist */}
  <MonthHeader />                   {/* "September 2026 • Active" + edit income/savings */}
  <SummaryCards />                  {/* 4 cards: Total Spent, Remaining, Available, Overspent */}
  <ExpenseList />                   {/* Table: date, category, type, amount, actions */}
  <CategoryBreakdown />             {/* Bars/list: category → total + % */}
</DashboardPage>
```

### 2. Data Fetching — Single Source Query

```typescript
// hooks/useMonthDashboard.ts
function useMonthDashboard() {
  const { data: months } = useQuery({ queryKey: ['months'], queryFn: api.getMonths });
  const activeMonth = months?.find(m => m.is_active);
  const activeMonthId = activeMonth?.id;

  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['summary', activeMonthId],
    queryFn: () => api.getSummary(activeMonthId!),
    enabled: !!activeMonthId,
    // staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true — from global config
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses', activeMonthId],
    queryFn: () => api.getExpenses(activeMonthId!),
    enabled: !!activeMonthId,
  });

  return { activeMonth, summary, expenses, isLoading, isError, error, refetch };
}
```

- **One `GET /months`** to find the active month (auto-created by middleware §8)
- **One `GET /months/{id}/summary`** for all 4 core questions (single request)
- **One `GET /months/{id}/expenses`** for the expense list table

### 3. Core User Question → Render Mapping

#### 3.1 "How much did I spend this month?"

| Source | Field | Render |
|--------|-------|--------|
| `summary.total_spent` | `"2750.00"` (string) | `SummaryCards` → **Total Spent** card: `$2,750.00` (monospace, green/neutral) |

#### 3.2 "How much money remains?"

| Source | Field | Render |
|--------|-------|--------|
| `summary.remaining` | `"2250.00"` (string, can be negative) | **Remaining** card: `$2,250.00` — red if negative |
| `summary.available_to_spend` | `"4000.00"` (string) | **Available to Spend** card: `$4,000.00` — budget ceiling (income − savings goal) |

#### 3.3 "What did I spend my money on (by category)?"

| Source | Field | Render |
|--------|-------|--------|
| `summary.spending_by_category` | `[{ category_name, total }, ...]` | `CategoryBreakdown` — horizontal bars sorted by `total` descending, each shows category name, amount, % of `total_spent` |

#### 3.4 "Did I overspend, based on my savings goal?"

| Source | Field | Render |
|--------|-------|--------|
| `summary.is_overspent` | `true/false` | **Overspent Badge** — prominent red badge `"Overspent"` in `SummaryCards` when `true` |
| `summary.total_spent > summary.available_to_spend` | (backend-computed) | Same badge; also colors **Remaining** card red when overspent |

### 4. Skipped Month Handling (Critical)

```tsx
// In DashboardPage, after summary fetch:
if (summary?.is_skipped) {
  return (
    <SkippedMonthView 
      month={activeMonth} 
      skippedAt={summary.skipped_at} 
    />
  );
}
```

**`SkippedMonthView` renders:**
- Month badge: `"September 2026 • Skipped"` (muted)
- Message: `"This month was intentionally skipped on [formatted skipped_at]"`
- **No numeric cards, no expense list, no category breakdown**
- No "edit" or "un-skip" affordance

### 5. Month Header — Income/Savings Edit

- Shows current `income` and `savings_goal` as editable inline fields (or "Set income" if `0`)
- On blur/submit → `PUT /api/months/{activeMonthId}` with `{ income, savings_goal }`
- Optimistic update: TanStack Query `onMutate` updates `['month', id]` and `['summary', id]` cache, rollback on error
- Disabled if `!activeMonth?.is_active` (shouldn't happen for active month, but defensive)

### 6. Expense List (`ExpenseList.tsx`)

- Table columns: **Date** | **Category** | **Type** | **Amount** | **Actions**
- **Date:** `YYYY-MM-DD` (from `expense.date`)
- **Category:** name from `categories` lookup (join via `category_id` — categories fetched via `useQuery(['categories'])`)
- **Type:** Badge — `Fixed` (blue) / `Variable` (amber)
- **Amount:** monospace, right-aligned
- **Actions:** Edit (→ `/expenses/:id/edit`), Delete (confirm dialog → `DELETE /expenses/{id}`)
- **Empty state:** "No expenses yet. [Add your first expense]" → navigates to `/expenses/new`
- **Skeleton:** `ExpenseListSkeleton` matching row count (5 rows)

### 7. Category Breakdown (`CategoryBreakdown.tsx`)

- Horizontal stacked bars or simple list — each row: category name, colored bar (width = % of total_spent), amount, percentage
- Colors: deterministic hash of category name → consistent color per category
- Includes soft-deleted categories for historical accuracy (backend handles via raw join §10.2)
- **Empty state:** "No spending by category yet" (when `total_spent === 0`)

### 8. Loading, Error, Empty States

| State | Pattern |
|-------|---------|
| **Initial load** | Full-page skeleton: `SummaryCardsSkeleton` (4 cards), `ExpenseListSkeleton` (5 rows), `CategoryBreakdownSkeleton` (3 bars) |
| **Refetch (window focus)** | Stale data stays visible; subtle spinner in top-bar corner (`isFetching` global) |
| **Query error** | Inline error card replacing content: `"Failed to load dashboard. [Retry]"` → calls `refetch()` |
| **Empty expenses** | `EmptyState` with CTA button to `/expenses/new` |
| **Empty categories** | Not shown on dashboard (only in breakdown when expenses exist) |

### 9. Visual Direction Applied

Per `Frontend-System-Design.md` §10:
- Accent: `#2563eb` (Blue-600) for primary actions, focus rings
- Success: `#16a34a` for positive remaining
- Danger: `#dc2626` for overspent badge, negative remaining
- Typography: `Inter` for UI, `JetBrains Mono` for all currency amounts
- Cards: `bg-white border border-neutral-200 rounded-lg p-4 sm:p-6`
- Badges: `rounded-full px-2 py-0.5 text-xs font-medium`

---

## Reasoning

- **Single summary query** answers all 4 questions — matches backend's `GET /months/{id}/summary` design (§10), avoids waterfall requests.
- **Branch on `is_skipped` before numeric render** — required by backend contract (§6.3.2, §13.3). Null fields would break display/calculations.
- **Skeleton matching final layout** — prevents layout shift, better perceived performance.
- **Optimistic income/savings update** — immediate feedback, rollback on error (rare).
- **Category colors via hash** — no backend dependency, consistent across sessions.

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| **Separate queries per metric** (spent, remaining, etc.) | 4+ requests for one view; backend computes all in one summary call. |
| **Client-side calculation of totals** | Violates backend rule: "calculated values always computed live by backend, never trust client" (§1.4, §10.4). |
| **Modal for income/savings edit** | Inline edit is faster for frequent tweaks; modal adds friction. |
| **Pie chart for category breakdown** | Overkill for personal monthly data; horizontal bars are more readable for exact amounts. |
| **Separate "Past Months" tab on dashboard** | Phase 1 is active-month only. Past months → Phase 2 `/months/:id` page. |

---

## Status

**Design complete, not yet built.**