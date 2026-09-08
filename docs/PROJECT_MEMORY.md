# PROJECT_MEMORY.md — Personal Finance Tracker

> Source of truth for system design. Read this first in any new chat before continuing work.

---

## 1. Project Goal & Scope

A Personal Finance Tracker API (Laravel + MySQL) that tracks monthly income against fixed/variable expenses. Built as a learning project — design-first approach, Claude acting as senior engineer instructor.

**Core user questions the system must answer:**
1. How much did I spend this month?
2. How much money remains?
3. What did I spend my money on (by category)?
4. Did I overspend, based on my savings goal?

**Architecture style:** Laravel as a pure REST API (no Blade views). Separate frontend planned later (not yet built/decided).

---

## 2. Data Model & Relationships

```
User (1) ──< (many) Month
User (1) ──< (many) Category
Month (1) ──< (many) Expense >── (1) Category
```

**User**
- id (PK)
- name
- email (unique)
- password (hashed)
- timestamps

**Month**
- id (PK)
- user_id (FK → users.id, `onDelete: cascade`)
- year
- month_number
- income (decimal 10,2)
- savings_goal (decimal 10,2)
- is_active (boolean, default true)
- is_skipped (boolean, default false) — true when user intentionally skipped this month
- skipped_at (timestamp, nullable) — when the skip decision was made
- Fillable: `income`, `savings_goal` only

**Category**
- id (PK)
- user_id (FK → users.id, `onDelete: cascade`)
- name
- default_type (enum: fixed/variable)
- is_default (boolean, default false) — true only for system-seeded categories
- deleted_at (Laravel SoftDeletes)
- Fillable: `name`, `default_type` only

**Expense**
- id (PK)
- amount (decimal 10,2)
- date (defaults to today if not provided — app logic, not DB default)
- type (enum: fixed/variable)
- category_id (FK → categories.id, `onDelete: restrict`)
- month_id (FK → months.id, `onDelete: restrict`) — NOT fillable, always set explicitly by controller logic
- Fillable: `amount`, `date`, `type`, `category_id`

**Relationships (Eloquent):**
- User `hasMany` Month / Month `belongsTo` User
- User `hasMany` Category / Category `belongsTo` User
- Category `hasMany` Expense / Expense `belongsTo` Category
- Month `hasMany` Expense / Expense `belongsTo` Month
- Category and Month have NO direct relationship to each other (only connect via Expense)
- Expense ownership is inherited through Month → User (no direct `user_id` on expenses)

**Calculated values (Month model methods — never stored):**
- `totalSpent()` = `expenses()->sum('amount')`
- `remaining()` = income − totalSpent()
- `availableToSpend()` = income − savings_goal
- `isOverSpent()` = totalSpent() > availableToSpend()
- `spendingByCategory()` = expenses joined with categories, grouped by category name, summed
- `summary()` = pure computation — combines all of the above into one array. Shape decision (skipped-vs-normal) belongs to `MonthSummaryResource`.

---

## 3. Core Business Rules

1. **Money fields always `decimal(10,2)`** — never `float` (avoids binary rounding errors).
2. **Calculated values are never stored** — always computed fresh from raw data (prevents drift/desync).
3. **Category type (Fixed/Variable) lives on the Expense**, not the Category — because the same category can vary between fixed/variable per entry. `Category.default_type` is just a pre-fill suggestion.
4. **Soft delete for Categories** (Laravel `SoftDeletes` trait): deleting hides a category from future selection (dropdowns, new expenses) but preserves it fully in historical data — past months' totals/breakdowns must never change due to a later deletion. Reasoning: "delete" = stop offering as an option going forward, not "erase the past."
5. **Hard delete for Expenses** — nothing references an Expense, so no orphaned-data risk.
6. **Active Month locking**: only one Month has `is_active = true` at a time. Only the active month allows add/edit/delete of expenses or editing income/savings_goal. Past months are fully read-only (view only). Enforced at app level (403 responses) AND DB level (FK `restrict` as defense-in-depth).
7. **Auto month creation**: on the first relevant request in a new calendar month, a new Month row is auto-created (via middleware), copying `income`/`savings_goal` from the previously active month (or defaulting to 0 if no previous month exists — first-ever use). The old active month is set `is_active = false`.
8. **Skipped months are NOT auto-backfilled with $0 data** — that would misrepresent "no data" as "spent nothing." Planned (not yet built): prompt user to optionally backfill or skip when gaps are detected.
9. **Expense date defaults to today** if not provided (app-level logic, not a DB default).
10. **Validation must account for soft-deletes manually** — `exists:` Laravel validation rule checks the raw table only, unaware of `deleted_at`. Must use `Rule::exists('categories','id')->whereNull('deleted_at')`.
11. **Always scope queries through `auth()->user()`** — never query models directly. This makes ownership checks structurally impossible to forget. For expenses (no direct `user_id`), use `whereHas('month', fn($q) => $q->where('user_id', auth()->id()))`.
12. **Categories are per-user, not global** — each user gets their own set of categories (the 3 defaults seeded at registration). One user's custom categories must never appear for another user.
13. **Skipped months are a one-shot decision**: when a month gap is detected, the user either backfills (provides income/savings_goal → normal month) or skips (creates a tombstone row with `is_skipped = true`). No take-backs — once skipped, `is_skipped` is permanent. Skipped months return nulls in all calculated summary fields. They appear in the month list so the user sees the full timeline.

---

## 4. Key Architectural Decisions & Reasoning

- **Fat Models, Skinny Controllers**: all business logic/calculations live on Eloquent models (reusable, testable, single source of truth). Controllers only: find → check rules → validate → call model/act → respond.
- **Foreign keys over duplicated data**: Expense references `category_id`/`month_id` rather than storing names directly — rename-safe, no repeated data.
- **`forceCreate()` for trusted internal writes** (seeders, auto-create middleware) — bypasses `$fillable` deliberately for system-controlled fields (`is_default`, `is_active`, `year`, `month_id`, etc.), since `$fillable` is a mass-assignment guard against *untrusted* (user) input only.
- **Direct property assignment** (`$model->field = x; $model->save();`) used when a field is intentionally not fillable but must be set by trusted logic outside mass assignment (e.g., `is_deleted`/`is_active` toggles, `month_id` on new Expense).
- **`new Model([...]) + ->save()` instead of `::create([...])`** whenever additional non-fillable fields must be set before the first insert — `create()` saves immediately, so setting fields after it causes a second query or DB errors (e.g., NOT NULL violation on `month_id`).
- **Nested routes for context-dependent collections**: `GET/POST /months/{month}/expenses` (index/store — always scoped to a month) vs flat `/expenses/{id}` (show/update/destroy — a single expense is uniquely identified by its own id, no month context needed).
- **Middleware for cross-cutting setup logic**: the "ensure current month exists" check runs as middleware (`EnsureCurrentMonthExists`, aliased `ensure.month`) applied to all Month/Expense routes — avoids repeating the check manually in every controller method.
- **Controller validation/check ordering**: existence check (404) → permission/state check (403) → input validation (422) → perform action. Cheapest/most fundamental checks first.
- **Defense in depth**: soft-delete enforced at app level, but DB-level `onDelete('restrict')` FK constraints back it up in case application logic is ever bypassed.
- **Expense ownership inherited, not duplicated**: expenses have no `user_id` column — ownership is always resolved through `expense → month → user`. Avoids data duplication and keeps the relationship chain explicit.
- **Default categories seeded at registration, not via global seeder**: the old `CategorySeeder` is orphaned (still exists, not run). Each new user gets their 3 default categories (Electricity, Gas, Water) as part of the registration flow in `AuthController::register()`, scoped to their `user_id`. Ensures categories are always per-user from the start.

---

## 5. Alternatives Considered & Rejected

- **Category type fixed on Category table** → rejected: same category can be fixed one month, variable another (real user input).
- **`locked` boolean on default categories (Electricity, etc. un-editable)** → rejected: some users don't pay certain bills; forcing a rule with no real justification is bad UX. Replaced with `is_default` (just a badge of origin, not a restriction) — everything stays user-editable/deletable.
- **Hard delete for Category** → rejected: would corrupt/orphan historical Expense data and silently distort past totals. Replaced with soft delete.
- **`onDelete('cascade')` on Expense's FKs** → rejected: would allow silent mass-deletion of expenses if a Category/Month were ever hard-deleted. Replaced with `restrict`.
- **Auto-creating skipped months with $0 data** → rejected: presents "unknown/missing" as if it were a real fact ("you spent $0"), which is misleading. Decided to only create the current month and (planned) prompt the user about gaps instead.
- **Savings goal as % of income** → rejected in favor of a simple fixed dollar amount (user preference, simpler UX).
- **Calculation logic in Controller** → rejected in favor of Model methods (reusability, "Fat Models Skinny Controllers").
- **`user_id` on `expenses` table** → rejected: ownership is always derivable through `expense → month → user`. Adding a redundant `user_id` would require keeping it in sync with the month's owner, creating an extra source of truth with drift risk.

---

## 6. Decisions Later Changed / Replaced

- **Category soft-delete implementation**: originally built manually with an `is_deleted` boolean column + manual `if` checks in every controller method. Later replaced with Laravel's built-in `SoftDeletes` trait (`deleted_at` timestamp) for automatic query filtering and cleaner code. Migration: dropped `is_deleted`, added `softDeletes()` via a new migration (original migration file left untouched, per proper migration practice).
- **`Category.is_default` default value**: initially defaulted to `true` in the migration (wrong — most categories are user-created). Corrected to default `false`; only the seeder explicitly sets `true` for starter categories.
- **`Month.savings_goal` column name**: initially typo'd as `saving_goal` in migration; corrected to `savings_goal` for consistency with design docs/code.
- **Month creation logic location**: initially being built as `MonthController@store()`. Realized `store` wasn't even routed (months are never manually created via API) — logic was moved entirely into `EnsureCurrentMonthExists` middleware instead.
- **Category seeding moved from global seeder to registration flow**: originally `CategorySeeder` seeded 3 defaults globally (no user_id). After adding auth, seeding happens inline in `AuthController::register()` per new user. The old `CategorySeeder` file remains but is no longer called — intentionally kept as a reference.
- **`MonthController::store()` removed**: originally left as dead code (excluded from routes via `apiResource except: ['store']`), kept "for reference." Revisited during the user-FK tightening refactor — method and its `Month` import removed entirely. Month creation is exclusively handled by `EnsureCurrentMonthExists` middleware.
- **`Month::summary()` is now pure computation**: the `is_skipped` branch was removed from the model method and moved to `MonthSummaryResource`. This keeps the model focused on data computation while the resource owns the presentation/shape decision (skipped months return nulls vs normal months return computed values).
- **`Month` `$casts` missing / full serialization chain**: `Month` had no explicit `$casts` array, causing `is_active`/`is_skipped` to serialize inconsistently (`1`/`0` vs `true`/`false`). Fixed by adding `$casts`. Audit also added `Category.is_default` (boolean), `Expense.amount` (`decimal:2`), and `Expense.date` (`date`). **Key lesson from the date fix:** a bare `'date'` cast only fixes PHP-level Carbon behavior — JSON serialization format (`Y-m-d` vs full ISO) must be enforced in the Resource (`ExpenseResource::format('Y-m-d')`), not the model cast. This is the same presentation-layer principle used for skipped-month null shapes (`MonthSummaryResource`). No fillable/validation/business changes.
- **`EnsureCurrentMonthExists` "Undefined method 'user'" investigation**: investigated (new-user first request, month rollover, gap endpoint, missing-token case), not reproduced under any condition. Middleware ordering confirmed correct (`auth:sanctum` before `ensure.month` in route groups). Root cause unconfirmed — not a deliberate fix, not resolved, no code changed for this.

---

## 7. Current Status

**Fully built, tested, and working (backend):**
- **User model** with `HasApiTokens` traits, `hasMany` relationships to `Month` and `Category`
- **AuthController**: `register` (creates user + seeds 3 default categories per user + issues token), `login` (issues token), `logout` (revokes current token), `user` (returns authenticated user)
- Auth routes: `POST /register`, `POST /login`, `POST /logout` (auth:sanctum), `GET /user` (auth:sanctum)
- All controllers scoped through `auth()->user()->months()` / `auth()->user()->categories()` / `whereHas('month', ...)` for expenses
- All Month/Expense routes wrapped in `auth:sanctum` + `ensure.month` middleware
- `EnsureCurrentMonthExists` middleware scoped to authenticated user — correctly creates first-ever month for new users
- Migration to add `user_id` to `months` and `categories` tables (applied)
- Migration to tighten `user_id` to NOT NULL on `months` and `categories` (matches docs §2; refuses to run if NULL rows exist)
- Migrations: `categories`, `months`, `expenses` (dependency order respected)
- Models: `Category`, `Month`, `Expense` — fillables, relationships, and Month's calculation methods all in place
- `CategorySeeder`: seeds Electricity, Gas, Water (all `default_type: fixed`, `is_default: true`) via `forceCreate()` — **orphaned** (no longer called; seeding now happens per-user at registration)
- `CategoryController`: index, store, update, destroy (soft delete) — no `show`
- `MonthController`: index, show, update (active-only), summary — no store/destroy (store logic lives in middleware, `store()` method is dead code excluded from routes)
- `ExpenseController`: index (nested, by month), show, store (nested, active-month only), update (active-month only), destroy (hard delete, active-month only)
- **GapController**: `index` (detect month gaps), `backfill` (create normal month for gap), `skip` (create skipped month for gap) — all auth-guarded, all tested
- Gap routes: `GET /gaps`, `POST /gaps/backfill`, `POST /gaps/skip` — inside `auth:sanctum` + `ensure.month`
- Migration to add `is_skipped` (boolean, default false) and `skipped_at` (nullable timestamp) to `months` table (applied)
- `Month::summary()` is pure computation — skipped-vs-normal shape decision moved to `MonthSummaryResource`
- Skipped months appear in `GET /months` with `is_skipped: true` — full history visible
- Routes fully wired in `routes/api.php`, mixing `apiResource` shortcuts with manual nested routes where needed
- `GET /months/{id}/summary` — returns income, savings_goal, total_spent, remaining, available_to_spend, is_overspent, spending_by_category (with category names via join, correctly includes soft-deleted categories' historical expenses; returns nulls for skipped months via `MonthSummaryResource`)
- **API Resources**: all responses wrapped in `data` key per Laravel convention
  - `UserResource` — with optional `token` via `withToken()` for auth responses
  - `MonthResource` — all month fields except `user_id`
  - `CategoryResource` — all category fields except `user_id` and `deleted_at`
  - `ExpenseResource` — all expense fields with optional embedded `category` via `whenLoaded()`
  - `MonthSummaryResource` — owns skipped-vs-normal shape decision (nulls for skipped, computed values for normal)

**Missing / not yet built:**
- No frontend — planned as a separate SPA

**79 Pest tests covering all endpoints** (auth, categories, months, expenses, gaps, summaries, API resource responses, serialization regression) — all passing. Serialization contracts guaranteed by explicit `$casts` + `ExpenseResource` formatting.

## 8. What's Next (Not Yet Designed/Built)

1. **Frontend** — stack/framework not yet decided; planned as a separate SPA consuming this API.
