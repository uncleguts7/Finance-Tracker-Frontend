# Feature Design — Skipped-Months Backfill/Skip Prompt

> Companion doc to PROJECT_MEMORY.md. Documents the design reasoning for handling
> month gaps in the Personal Finance Tracker API. Read PROJECT_MEMORY.md first
> for full system context.

---

## 1. Problem

When a user takes a break from the app (e.g., stops using it for 2+ months), the
`EnsureCurrentMonthExists` middleware only creates a row for the **current**
calendar month on the next request. The months in between have no row in the
`months` table at all — they are silent gaps.

The user has no way to discover these gaps, let alone acknowledge them. If they
check their month list, they see a chronological jump with no trace of the
missing months — no way to tell "I never tracked this" from "I intentionally
skipped it."

**Constraint (PROJECT_MEMORY.md §3, rule 8):** Gaps must NOT be auto-backfilled
with $0 data — that would misrepresent "no data" as "spent nothing."

---

## 2. Data Model Changes

**`months` table** — add two columns:

| Column | Type | Default | Nullable | Purpose |
|---|---|---|---|---|
| `is_skipped` | `boolean` | `false` | No | Marks a month as intentionally skipped by the user |
| `skipped_at` | `timestamp` | — | Yes | Records when the user made the skip decision |

No new tables. No new models. No changes to `categories` or `expenses` tables.

**Fillable on `Month` model:** unchanged — `income`, `savings_goal` only.
`is_skipped` and `skipped_at` are set via `forceCreate()` (trusted internal
writes from controller) or direct property assignment.

---

## 3. Gap Detection Logic

```
GET /api/gaps
```

**Auth:** `auth:sanctum` required.
**Middleware:** `ensure.month` (applied so the current month always exists before
we compute gaps).

### Algorithm

1. Find the user's **earliest** `Month` row (smallest `year` + `month_number`).
   - If no months exist (brand-new user who hasn't hit any month route yet),
     return an empty list — no gaps possible.
2. Determine the **current month** (today's `year` + `month_number`). The
   middleware already ensures this has a row.
3. Enumerate every month between the earliest month and the current month
   (inclusive range).
4. Filter out months that already have a `Month` row for this user (normal OR
   skipped — both have a row).
5. Filter out the current month (it was just created by middleware).
6. Return the remaining months as the gap list.

### Response shape

```json
{
  "gaps": [
    { "year": 2026, "month_number": 3, "label": "March 2026" },
    { "year": 2026, "month_number": 4, "label": "April 2026" }
  ]
}
```

Simple list, no surrounding context. The frontend can fetch `GET /months` for
context around each gap if needed.

### Edge cases

- **No months at all** (new user, never made a request) → empty `[]`.
- **Every month has a row** → empty `[]`.
- **Only the current month exists** (user's first-ever request) → empty `[]`
  (earliest = current = same month, no gaps possible).
- **Gap includes a month that is the *next* month after the latest** (common
  case: user skipped just last month) → returned normally.

---

## 4. Backfill Flow

```
POST /api/gaps/backfill
```

**Auth:** `auth:sanctum` required.
**No idempotency** — each gap month is handled in a separate request (no bulk).

### Request body

```json
{
  "year": 2026,
  "month_number": 3,
  "income": 5000.00,
  "savings_goal": 1000.00
}
```

### Validation

```php
'year' => 'required|integer|min:2000|max:2099',
'month_number' => 'required|integer|min:1|max:12',
'income' => 'required|numeric|min:0',
'savings_goal' => 'required|numeric|min:0',
```

Plus **server-side eligibility check** (not validation rules — checked after):
- The specified month must not already have a `Month` row for this user.
- The specified month must fall within the gap range (earliest month to current
  month, exclusive of months that already have a row).

### Action

1. Validate input.
2. Confirm month is a genuine gap (no existing row, within range).
3. `forceCreate()` a new `Month` row:
   - `user_id` = authenticated user's id
   - `year`, `month_number` = from request
   - `income`, `savings_goal` = from request
   - `is_active` = `false` (it's a past month — always read-only)
   - `is_skipped` = `false`
4. Return the created Month with `201`.

### What backfill does NOT do

- It does **not** create expenses. The user adds expenses separately via the
  existing `POST /months/{monthId}/expenses`. Rationale: the user needs to
  categorise each expense; a bulk "create from nothing" would require a UI for
  that, which is a frontend concern.
- It does **not** change the active month (the current month stays active).
- It does **not** create a cascade of related records.

### Edge cases

- **Backfilling a month that's the earliest or latest in the user's history**
  → works normally. The gap range is recomputed on each `GET /gaps` call, so
  backfilled months are excluded from future queries.
- **Backfilling a month that was already skipped** → rejected (eligibility
  check: row already exists). This is the "no take-backs" rule — a skip is
  permanent. User would need to delete the row manually (not exposed via API).

---

## 5. Skip Flow

```
POST /api/gaps/skip
```

**Auth:** `auth:sanctum` required.

### Request body

```json
{
  "year": 2026,
  "month_number": 3
}
```

### Validation

```php
'year' => 'required|integer|min:2000|max:2099',
'month_number' => 'required|integer|min:1|max:12',
```

Same **eligibility check** as backfill: month must be a genuine gap.

### Action

1. Validate input.
2. Confirm month is a genuine gap.
3. `forceCreate()` a new `Month` row:
   - `user_id` = authenticated user's id
   - `year`, `month_number` = from request
   - `income` = `0`
   - `savings_goal` = `0`
   - `is_active` = `false`
   - `is_skipped` = `true`
   - `skipped_at` = `now()`
4. Return the created Month with `201`.

### One-shot decision — permanent

Once a month is marked `is_skipped = true`, it cannot be flipped back via the
API. There is no "un-skip" endpoint. Rationale:
- The user already made an active choice to skip; un-skipping would require the
  same data-entry burden as backfilling (providing income/savings_goal +
  expenses).
- Keeping it clean means the `is_skipped` flag is a permanent tombstone record,
  not a mutable state.
- If the user truly wants to undo, they could manually delete the row via a
  direct DB operation (power user, not API-supported).

---

## 6. Summary Impact

`Month::summary()` gains a guard at the top:

```php
public function summary(): array
{
    if ($this->is_skipped) {
        return [
            'is_skipped' => true,
            'skipped_at' => $this->skipped_at,
            'income' => null,
            'savings_goal' => null,
            'total_spent' => null,
            'remaining' => null,
            'available_to_spend' => null,
            'is_overspent' => null,
            'spending_by_category' => [],
        ];
    }

    // existing logic unchanged
}
```

This distinguishes "I skipped" from "I earned/spent $0" at a glance. The
frontend can render skipped months as a special card: "March 2026 — Skipped."

All other Month methods (`totalSpent()`, `remaining()`, etc.) are **unchanged**
— they are internal helpers used by `summary()`, and the guard in `summary()`
is the only place the skipped check is needed. If an external caller calls
`$month->totalSpent()` directly on a skipped month, they get `0` (which is
technically correct — no expenses were recorded). But the recommended/safe
path is to always go through `summary()`.

---

## 7. Month Index Impact

`GET /months` — already scoped to `auth()->user()->months()`. Skipped months
appear in the list automatically (they have a row in `months`). The response
includes the `is_skipped` attribute, letting the frontend render them
differently (greyed out, badge, etc.).

```json
[
  { "id": 1, "year": 2026, "month_number": 1, "is_skipped": false, ... },
  { "id": 2, "year": 2026, "month_number": 2, "is_skipped": false, ... },
  { "id": 3, "year": 2026, "month_number": 3, "is_skipped": true,
    "skipped_at": "2026-09-02T12:00:00Z", "income": 0, "savings_goal": 0, ... },
  { "id": 4, "year": 2026, "month_number": 4, "is_skipped": false, ... }
]
```

No model/controller change needed for `index()` — `is_skipped` and `skipped_at`
are database columns that are automatically included in the JSON response.

---

## 8. Active-Month Rule — Unchanged

The existing business rule (only the active month allows writes) is **not
modified** for this feature:

- A skipped month has `is_active = false` — it's a past month, locked.
- A backfilled month has `is_active = false` — it's a past month, locked.
- The only writable month is the current active month.

This means a backfilled month's `income` and `savings_goal` are set once at
creation and never edited. If the user made a typo, they'd need to delete the
month (not API-supported) or create a compensating expense entry (awkward but
possible). This is an acceptable trade-off — the feature is about
acknowledging/recording gaps, not retroactive editing.

---

## 9. Migration

```php
Schema::table('months', function (Blueprint $table) {
    $table->boolean('is_skipped')->default(false)->after('is_active');
    $table->timestamp('skipped_at')->nullable()->after('is_skipped');
});
```

No down migration needed for a nullable column addition — rolling back via
`schema:dump` handles it. If a manual rollback is needed later, a separate
migration can drop the columns.

Existing rows: `is_skipped = false` (default), `skipped_at = null` — which is
correct (they are normal, non-skipped months).

---

## 10. New Controller: `GapController`

New file: `app/Http/Controllers/GapController.php`

Methods:
- `index()` — return list of gap months (eligibility described in §3)
- `backfill()` — create a normal Month row for a gap month (§4)
- `skip()` — create a skipped Month row for a gap month (§5)

Scoping follows the established pattern: all queries go through
`auth()->user()->months()`.

### Route registration (in `routes/api.php`)

```php
Route::middleware(['auth:sanctum', 'ensure.month'])->group(function () {
    // existing routes...

    // New gap routes
    Route::get('/gaps', [GapController::class, 'index']);
    Route::post('/gaps/backfill', [GapController::class, 'backfill']);
    Route::post('/gaps/skip', [GapController::class, 'skip']);
});
```

Placed inside the `auth:sanctum` group alongside existing Month/Expense routes,
with `ensure.month` applied (so the current month exists before we compute gaps).

---

## 11. Full List of Files Affected

| File | Change |
|---|---|
| `database/migrations/xxxx_xx_xx_xxxxxx_add_is_skipped_to_months_table.php` | New migration — add `is_skipped` + `skipped_at` |
| `app/Models/Month.php` | Update `summary()` to return nulls when `is_skipped` is true |
| `app/Http/Controllers/GapController.php` | New controller — `index()`, `backfill()`, `skip()` |
| `routes/api.php` | Add 3 new gap routes inside auth+ensure.month group |
| `docs/PROJECT_MEMORY.md` | Update §2 (add new columns), §7 (mark as built), fold design into appropriate sections |

---

## 12. Status

Design complete. Not yet built.