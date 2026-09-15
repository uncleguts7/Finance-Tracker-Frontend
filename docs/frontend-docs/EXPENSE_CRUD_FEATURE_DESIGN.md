# Expense CRUD Feature Design — Frontend

> Status: **built** (with post-build fixes — see [11. Post-Build Fixes](#11-post-build-fixes))

---

## Problem Statement

The frontend needs full CRUD for expenses on the **active month only**:
- **Create:** `/expenses/new` — amount, date, type (fixed/variable), category
- **Read:** Listed on Dashboard (`GET /months/{id}/expenses`)
- **Update:** `/expenses/:id/edit` — same fields, pre-filled
- **Delete:** Inline on Dashboard expense row — confirm → `DELETE /expenses/{id}`

Backend enforces: only active month accepts writes (§5.5, §7.4). Past months return `403`. Expense `type` is per-expense, not per-category (§5.3). Category dropdown excludes soft-deleted categories (§5.4).

Backend contract: `Backend-System-design.md` §6.5, §7.4, §11 (expense validation), §12.4 (expense errors).

---

## Design

### 1. Routes & Pages

| Route | Page | Mode |
|-------|------|------|
| `/expenses/new` | `ExpenseFormPage` | Create |
| `/expenses/:id/edit` | `ExpenseFormPage` | Edit (pre-filled) |

**Shared component:** `ExpenseForm.tsx` — used by both pages, receives `initialData?: Expense` for edit mode.

### 2. Form Component (`ExpenseForm.tsx`)

```tsx
interface ExpenseFormProps {
  initialData?: Expense;  // undefined = create mode
  onSuccess: () => void;  // navigate away or reset
}

function ExpenseForm({ initialData, onSuccess }) {
  const { data: categories } = useQuery({ queryKey: ['categories'] });
  const lastCategoryId = localStorage.getItem('lastExpenseCategoryId');
  
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(createExpenseSchema(categories ?? [])),
    defaultValues: {
      amount: initialData ? Number(initialData.amount) : '',
      date: todayISO(),           // YYYY-MM-DD (local date, not UTC)
      type: 'variable',           // default per backend (§7.4: defaults to today, type required)
      category_id: initialData?.category_id ?? 
                   Number(lastCategoryId) ?? 
                   categories?.[0]?.id,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createExpense(activeMonthId, data),
    onSuccess: () => {
      const catId = form.getValues('category_id');
      localStorage.setItem('lastExpenseCategoryId', String(catId));
      queryClient.invalidateQueries({ queryKey: ['summary', activeMonthId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', activeMonthId] });
      onSuccess();
    },
    onError: handleApiError(form), // maps 422 → setError
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary', activeMonthId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', activeMonthId] });
      onSuccess();
    },
    onError: handleApiError(form),
  });

  // Render: two buttons
  // <Button type="submit">Save</Button>
  // <Button type="button" variant="outline" onClick={handleSaveAndAnother}>
  //   Save & add another
  // </Button>
}
```

### 3. Zod Schema (`lib/schemas.ts`)

```typescript
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
```

> **Client-only validation:** `category_id` refine checks against currently loaded `GET /categories`. Server 422 catches stale-list case (category soft-deleted since load).
>
> **Note:** Schema is a factory function (`createExpenseSchema(categories)`) because `categories` comes from a `useQuery` hook at runtime. A static export would either throw `ReferenceError` on import or close over an empty/undefined array.

### 4. Two-Button Submit Pattern

| Button | Behavior |
|--------|----------|
| **Save** | Submit → on success, `navigate('/')` (back to dashboard) |
| **Save & add another** | Submit → on success, `form.reset({ date: todayISO(), type: currentCategory.default_type, category_id: lastUsedCategoryId, amount: '' })` — stays on `/expenses/new` (type resets to the kept category's `default_type`, not hardcoded `variable`) |

- `lastUsedCategoryId` persisted to `localStorage` (`lastExpenseCategoryId`) on every successful submit
- Amount field `autoFocus` on mount
- Date defaults to today (`YYYY-MM-DD`) — uses local `todayISO()` helper (see `lib/utils.ts`):

```typescript
function todayISO(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
```

> **Why not `toISOString().split('T')[0]`?** That returns UTC date, which is the previous calendar day for users in timezones ahead of UTC during local midnight hours (e.g. 00:30 AM UTC+2 → still previous day in UTC).

### 5. Delete Flow (Dashboard Inline)

- Each `ExpenseRow` has a delete icon → opens `Dialog` (shadcn/ui)
- Confirm text: `"Delete this expense? This cannot be undone."`
- On confirm → `DELETE /api/expenses/{id}`
- On success → invalidate `['summary', activeMonthId]`, `['expenses', activeMonthId]`
- On 403 (past month) → toast error `"Cannot delete an expense from a past month"`

### 6. Server 422 → RHF Error Mapping

```typescript
function handleApiError(form) {
  return (error: unknown) => {
    if (error instanceof ApiError && error.isValidationError()) {
      const errors = error.getValidationErrors();
      Object.entries(errors).forEach(([field, messages]) => {
        form.setError(field as keyof ExpenseInput, { message: messages[0] });
      });
      // Non-field errors (shouldn't happen for expenses, but defensive)
      if (error.body.message && !errors[error.body.message]) {
        form.setError('root', { message: error.body.message });
        toast.error(error.body.message);
      }
    } else if (error instanceof ApiError) {
      // 403, 404, etc.
      toast.error(error.message);
      if (error.status === 403) form.setError('root', { message: error.message });
    }
  };
}
```

**All blocking errors show form-level banner + toast** — not either/or.

### 7. Category Dropdown & Category → Type Sync

- Populated from `useQuery(['categories'])` — only non-deleted categories (backend excludes soft-deleted)
- Option label: `${category.name} (${category.default_type})` — shows default type as hint
- Last option is `+ Add Category` (sentinel value `-1`) — opens `CreateCategoryModal` inline. On success the new category is auto-selected and its `default_type` applied; on cancel, the previous selection (or last-used/first category) is restored.

**Category → Type sync (as implemented):** every time the category changes, the Type field is set to the category's `default_type`:

- Category `default_type: variable` → Type = `variable`, Type select **editable** — the user may still override it to `fixed` for this expense (§5.3: type lives on the expense).
- Category `default_type: fixed` → Type = `fixed`, Type select **disabled/locked** — a fixed-category expense cannot be marked variable from Add/Edit Expense.

Implementation: a `form.watch` subscription observes `category_id` changes and calls `setValue('type', category.default_type)`. The disabled state is derived reactively: `form.watch('category_id')` → `categories.find(...)?.default_type === 'fixed'`.

### 8. Loading & Error States

| State | Pattern |
|-------|---------|
| **Form submit** | Button disabled, shows spinner, `aria-busy="true"` |
| **Categories not loaded** | Select shows skeleton options, disabled until loaded |
| **Validation error** | Inline field errors (RHF) + form banner + toast |
| **403 (past month)** | Toast + form banner `"Cannot add/update expense to a past month"` |
| **404** | Toast `"Expense not found"` + navigate to `/` |

### 9. Visual Direction Applied

Per `Frontend-System-Design.md` §10:
- Inputs: `h-10 px-3 border border-neutral-300 focus:ring-2 focus:ring-blue-500`
- Error inputs: `border-red-500 focus:ring-red-500`
- Type badges: `Fixed` = `bg-blue-100 text-blue-700`, `Variable` = `bg-amber-100 text-amber-700`
- Delete button: `text-red-600 hover:text-red-700`
- Dialog: `rounded-lg border border-neutral-200 bg-white p-6`

---

## Reasoning

- **Shared form component** — create/edit differ only in `initialData` and mutation; single source of truth for validation, layout, UX.
- **Two-button pattern** — supports "add multiple expenses in a row" workflow without context switch to dashboard.
- **`lastUsedCategoryId` in localStorage** — durable user preference, survives refresh (query cache can evict).
- **Category default_type drives the type field** — selecting a category sets `type` to its `default_type`; variable categories leave Type editable (per-expense override still allowed, §5.3), fixed categories lock it to `fixed`.
- **Delete via Dialog** — confirms destructive action, accessible (focus trap, ESC to close).
- **Invalidation targets summary + expenses** — expense mutations change both totals and list.

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| **Modal expense form on dashboard** | Decision 2a: full-page routes for Phase 1. Simpler, deep-linkable, mobile-friendly. Revisit if friction proven. |
| **Inline expense row editing** | Complex for multi-field rows; full page is clearer for amount/date/type/category. |
| **Optimistic UI for create/update** | TanStack Query invalidation is fast enough; optimistic adds rollback complexity for low-value gain. |
| **Type selector fully independent of category** | Originally designed (and rejected here) the opposite way. Revised post-build: category `default_type` now syncs the Type field — `variable` categories keep it editable (preserving §5.3 per-expense override), `fixed` categories lock it to `fixed`. |
| **Separate create/edit components** | Duplicates validation, layout, error handling. Shared component + `initialData` is DRY. |

---

---

## 11. Post-Build Fixes

### 11.1 Edit form: amount not pre-filled (commit `f2df49d`)
`defaultValues.amount` was hardcoded to empty in edit mode. Fixed by parsing the stored string amount to a number when `initialData` is present (`defaultValues.amount = initialData ? Number(initialData.amount) : ''`).

### 11.2 Category → Type synchronization broken (commit `ca34839`)
Two React Hook Form bugs prevented the Type field from following the selected Category:

1. **Type never synced:** the `form.watch((value, { name }) => …)` callback treated `value` as the changed field's value (`value as number`), but RHF passes the **entire form values object** as the first argument. `categories.find(c => c.id === categoryId)` therefore never matched and `setValue('type', …)` never ran. Fixed by reading `value.category_id`.
2. **Lock state stale:** the disabled flag used `form.getValues('category_id')` at render time, which is non-reactive — category changes didn't re-render, so Type never locked/unlocked. Fixed with `form.watch('category_id')`.

Verified: variable → editable `variable`; fixed → locked `fixed`; repeated transitions always reflect the selected category.

---

## Status

**Built.** Includes category→type sync, inline "+ Add Category" flow, and both post-build fixes above.