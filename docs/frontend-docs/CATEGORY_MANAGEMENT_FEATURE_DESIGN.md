# Category Management Feature Design — Frontend

> Status: **design complete, not yet built**

---

## Problem Statement

Phase 2 feature: Full CRUD for user-scoped categories at `/categories`:
- **List:** All non-deleted categories for the user (`GET /categories`)
- **Create:** Modal — name + default_type (fixed/variable)
- **Update:** Modal — edit name + default_type
- **Delete:** Soft-delete — removes from list, preserves historical data, prevents future expense assignment

Backend seeds 3 default categories per user at registration (`Electricity`, `Gas`, `Water` — all `default_type: fixed`, `is_default: true`). User can delete defaults (soft-delete only). Categories are per-user (§5.10).

Backend contract: `Backend-System-design.md` §6.4, §7.3, §11 (category validation), §5.4 (soft-delete behavior), §10.2 (soft-deleted in historical breakdowns).

---

## Design

### 1. Route & Page

| Route | Page |
|-------|------|
| `/categories` | `CategoriesPage` |

**Page structure:**
```
<CategoriesPage>
  <PageHeader>
    <h1>Categories</h1>
    <Button onClick={openCreateModal}>New Category</Button>
  </PageHeader>
  <CategoryTable />           {/* or empty state */}
  <CreateCategoryModal />
  <EditCategoryModal />
  <DeleteConfirmDialog />
</CategoriesPage>
```

### 2. Data Fetching

```typescript
// hooks/useCategories.ts
function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories, // GET /api/categories
  });
}
```

- Returns `{ data: Category[] }` — only non-deleted (backend applies soft-delete scope)
- Invalidated on: `POST/PUT/DELETE /categories` (see `Frontend-System-Design.md` §3.3)

### 3. Category Table (`CategoryTable.tsx`)

| Column | Content |
|--------|---------|
| **Name** | Category name |
| **Default Type** | Badge: `Fixed` (blue) / `Variable` (amber) |
| **Default** | `is_default` badge (muted) — only for 3 seeded categories |
| **Actions** | Edit / Delete buttons |

**Empty state:** "No categories yet. [Create your first category]" → opens create modal.

**Skeleton:** 5-row table skeleton.

### 4. Create Modal (`CreateCategoryModal.tsx`)

- Fields: `name` (required), `default_type` (required, `fixed`/`variable` select)
- Zod schema:
```typescript
export const categorySchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  default_type: z.enum(['fixed', 'variable']),
});
```
- Submit → `POST /api/categories`
- On success → invalidate `['categories']` → modal closes → toast "Category created"
- On 422 → map errors to RHF `setError` (field-level)

### 5. Edit Modal (`EditCategoryModal.tsx`)

- Pre-filled with selected category data
- Same fields + validation as create
- Submit → `PUT /api/categories/{id}`
- On success → invalidate `['categories']` → modal closes → toast "Category updated"

### 6. Delete Flow (Soft-Delete)

- Click Delete → `DeleteConfirmDialog`:
```
Delete "Food"?
This hides it from future expense selection but preserves all historical data.
Past months' totals and breakdowns will not change.

[ Cancel ]  [ Delete ]
```
- Confirm → `DELETE /api/categories/{id}`
- On success → invalidate `['categories']` → toast "Category deleted"
- **Does NOT invalidate `['summary', ...]`** — soft-delete never changes historical totals (§5.4, §10.2)

### 7. Default Categories (Seeded at Registration)

- 3 categories created on register: `Electricity`, `Gas`, `Water`
- `is_default: true`, `default_type: fixed`
- User can edit name/type or soft-delete them — no special protection
- `is_default` shown as a muted badge in table for context only

### 8. Integration with Expense Form

- Expense form (`ExpenseForm.tsx`) fetches `['categories']` for dropdown
- Dropdown options: only non-deleted categories (backend guarantee)
- Option label: `${name} (${default_type})` — shows default type as hint
- **Type selector remains independent** — user chooses `fixed`/`variable` per expense

### 9. Loading, Error, Empty States

| State | Pattern |
|-------|---------|
| **Initial load** | Table skeleton (5 rows) |
| **Refetch** | Stale data visible, subtle spinner |
| **Create/Edit validation error** | Inline field errors + form banner + toast |
| **Delete error (404)** | Toast "Category not found" |
| **Empty list** | Empty state with CTA to create modal |

### 10. Visual Direction Applied

Per `Frontend-System-Design.md` §10:
- Table: `border border-neutral-200 rounded-lg overflow-hidden`
- Badges: `Fixed` = `bg-blue-100 text-blue-700`, `Variable` = `bg-amber-100 text-amber-700`
- `is_default` badge: `bg-neutral-100 text-neutral-500`
- Modals: `rounded-lg border border-neutral-200 bg-white p-6`
- Danger button (delete): `text-red-600 hover:text-red-700`

---

## Reasoning

- **Modal-based CRUD** — keeps user on `/categories` page, no navigation loss, consistent with shadcn/ui `Dialog` pattern.
- **Soft-delete communicated clearly** — confirm dialog explains historical preservation, no "un-delete" (backend has no restore).
- **No summary invalidation on delete** — critical: backend guarantees historical totals unchanged (§10.2). Invalidating summary would cause unnecessary refetch.
- **Default categories editable/deletable** — backend has no `locked` flag (§5.11 alternative rejected); `is_default` is just origin metadata.
- **Category list feeds expense form** — single query key `['categories']` shared, invalidated on any category mutation.

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| **Inline table editing** | Modals are simpler for validation, focus management, and confirmation. Inline editing adds complexity for marginal UX gain. |
| **Hard delete for categories** | Would corrupt historical data — backend uses soft-delete specifically to preserve history (§5.4). |
| **Separate page for create/edit** | Overkill for 2-field forms; modal keeps context. |
| **Protect default categories (no delete)** | Backend explicitly rejected `locked` flag (§5.11). User should control their categories. |
| **Global category list (shared across users)** | Backend: categories are per-user (§5.10). Frontend must never assume global categories. |

---

## Status

**Design complete, not yet built.**