# Backend System Design — Personal Finance Tracker

> Source of truth for the frontend team. Everything below reflects the **actual**
> backend implementation in this repository plus the existing decisions in
> `docs/PROJECT_MEMORY.md`, `docs/AUTH_FEATURE_DESIGN.md`,
> `docs/SKIPPED_MONTHS_FEATURE_DESIGN.md`, and
> `docs/API_RESOURCES_FEATURE_DESIGN.md`. This file does **not** redesign the
> backend and does **not** invent behaviour that does not exist.

---

## Table of Contents

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Base URL, API Conventions & Error Format](#2-base-url-api-conventions--error-format)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Data Model — Entities, Fields & Relationships](#4-data-model--entities-fields--relationships)
5. [Business Rules the Frontend Must Respect](#5-business-rules-the-frontend-must-respect)
6. [API Resources — Response Shapes](#6-api-resources--response-shapes)
7. [Endpoints Reference (by Controller)](#7-endpoints-reference-by-controller)
   - 7.1 [Auth](#71-auth)
   - 7.2 [Months](#72-months)
   - 7.3 [Categories](#73-categories)
   - 7.4 [Expenses](#74-expenses)
   - 7.5 [Gaps (Skipped-Months Backfill/Skip)](#75-gaps-skipped-months-backfillskip)
8. [The "Current Month" Middleware — Auto-Creation](#8-the-current-month-middleware--auto-creation)
9. [Skipped Months & Gap Handling](#9-skipped-months--gap-handling)
10. [Calculated Values (Month Summary)](#10-calculated-values-month-summary)
11. [Validation Rules by Endpoint](#11-validation-rules-by-endpoint)
12. [Error Responses — Status Codes & Messages](#12-error-responses--status-codes--messages)
13. [Edge Cases & Frontend Implications](#13-edge-cases--frontend-implications)
14. [What Is Intentionally NOT in the Backend](#14-what-is-intentionally-not-in-the-backend)
15. [Quick Reference — Frontend Behaviour Cheat Sheet](#15-quick-reference--frontend-behaviour-cheat-sheet)

---

## 1. System Overview & Architecture

### 1.1 What the backend is

A **Laravel + MySQL REST API** that tracks monthly income against fixed/variable
expenses for personal use. Built with Sanctum token auth. Every user owns
their own data — categories, months, and expenses are per-user.

### 1.2 Core user questions the system answers

1. How much did I spend this month?
2. How much money remains?
3. What did I spend my money on (by category)?
4. Did I overspend, based on my savings goal?

### 1.3 High-level architecture

```
┌─────────────────────┐    HTTPS    ┌──────────────────────────┐
│   Frontend SPA      │ ◀────────▶  │  Laravel REST API        │
│   (separate folder) │ Bearer JWT  │  (Sanctum tokens)        │
└─────────────────────┘             └────────────┬─────────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │   MySQL DB  │
                                          │  users      │
                                          │  categories │
                                          │  months     │
                                          │  expenses   │
                                          │  personal_  │
                                          │  access_    │
                                          │  tokens     │
                                          └─────────────┘
```

- **No server-rendered views.** All responses are JSON.
- **Stateless authentication** via Sanctum bearer tokens (database-persisted
  via `personal_access_tokens` table).
- **Per-user ownership** is enforced at the controller level via
  `auth()->user()->...` relationships, not via repeated `where('user_id', ...)`
  checks.

### 1.4 Frontend ↔ Backend interaction model

- The frontend calls JSON endpoints; the backend never returns HTML.
- The frontend stores the Sanctum token locally (e.g. `localStorage`,
  cookie, secure storage — your choice) and sends it on every authenticated
  request as `Authorization: Bearer {token}`.
- All requests must use `Accept: application/json` (the API renders JSON
  exceptions for any `api/*` request — see
  `bootstrap/app.php` `shouldRenderJsonWhen`).
- All successful resource responses are wrapped in a top-level `data` key
  (Laravel API Resource convention). Lists become `{ "data": [ ... ] }`,
  single items become `{ "data": { ... } }`. Two endpoints deviate (see §2.3).
- Calculated values (totals, remaining, etc.) are **always computed live** by
  the backend — never trust a total sent from the client.

---

## 2. Base URL, API Conventions & Error Format

### 2.1 Base URL

All endpoints are prefixed with `/api`. Example:

```
GET  https://<your-host>/api/user
POST https://<your-host>/api/login
```

### 2.2 HTTP methods

Standard REST verbs: `GET` (read), `POST` (create / action),
`PUT`/`PATCH` (update — only `PUT` is used in this codebase), `DELETE`
(destroy).

### 2.3 Response wrapping — the `data` key

| Endpoint family                                  | Success shape                                                |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Single resource (show/update/create)             | `{ "data": { ...fields... } }`                                |
| Resource collection (index)                       | `{ "data": [ {...}, {...} ] }`                                |
| `GET /gaps`                                       | `{ "gaps": [ ... ] }` — **NOT** wrapped in `data` (see §7.5) |
| `POST /logout`                                    | `{ "message": "Logged out successfully" }` — no resource     |
| Auth `POST /register`, `POST /login`              | `{ "data": { "id", "name", "email", "token" } }`              |
| `GET /user`                                       | `{ "data": { "id", "name", "email" } }` — no `token` key      |

> **Important:** Frontend must always read response payloads through `data`,
> **except** for `GET /gaps` (read `gaps`) and the logout endpoint
> (read `message`).

### 2.4 Error response shape

All errors are **hand-rolled** plain JSON — they are NOT wrapped in `data`:

```json
{ "message": "Month not found" }
```

Validation errors (HTTP 422) use Laravel's default shape:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."],
    "income": ["The income field is required."]
  }
}
```

### 2.5 Status codes used

| Status | Meaning in this API                                               |
| ------ | ----------------------------------------------------------------- |
| 200    | OK — read / update / destroy / login / logout succeeded           |
| 201    | Created — register, store, backfill, skip                         |
| 401    | Unauthenticated (missing / invalid token) — from `auth:sanctum`   |
| 403    | Forbidden — e.g. trying to write to a past month                  |
| 404    | Not found — model belongs to someone else, or id does not exist   |
| 422    | Validation error, or month-already-exists gap conflict            |

The frontend should branch on these.

---

## 3. Authentication & Authorization

### 3.1 Token mechanism — Laravel Sanctum

- Tokens are issued on **register** and **login** and stored in the
  `personal_access_tokens` table (managed by Sanctum).
- Each token has a `plainTextToken` string the client must capture and store.
  The same string is needed to send `Authorization: Bearer <token>`.
- **Logout** deletes the *current* token only (does not invalidate other
  tokens the user might have). Multi-device users stay logged in on other
  devices.

### 3.2 Endpoints

| Method | Path             | Auth required | Returns                                  |
| ------ | ---------------- | ------------- | ---------------------------------------- |
| POST   | `/api/register`  | No            | `{ "data": { id, name, email, token } }` |
| POST   | `/api/login`     | No            | `{ "data": { id, name, email, token } }` |
| POST   | `/api/logout`    | Yes (sanctum) | `{ "message": "Logged out successfully" }` |
| GET    | `/api/user`      | Yes (sanctum) | `{ "data": { id, name, email } }` (no token) |

### 3.3 Registration side-effects

When a user registers, the backend **atomically** (inside a DB transaction):

1. Creates the `User` row.
2. Seeds **3 default categories** scoped to the new user:
   - `Electricity` (`default_type: fixed`, `is_default: true`)
   - `Gas`         (`default_type: fixed`, `is_default: true`)
   - `Water`       (`default_type: fixed`, `is_default: true`)
3. Issues a Sanctum token and returns it with the response.

> Frontend implication: A brand-new user **always has 3 default categories**
> on day one — they can immediately add expenses. No month exists yet
> (months are auto-created on first Month/Expense route hit — see §8).

### 3.4 Authorization (ownership)

Every Month, Category, and Expense is owned by exactly one user. Ownership is
enforced **structurally** via Eloquent relationships through
`auth()->user()`:

| Resource   | Query pattern                                                              |
| ---------- | -------------------------------------------------------------------------- |
| Month      | `auth()->user()->months()->find($id)` or `auth()->user()->months`           |
| Category   | `auth()->user()->categories()->find($id)` or `auth()->user()->categories`   |
| Expense    | `Expense::whereHas('month', fn($q) => $q->where('user_id', auth()->id()))` |

When a resource belongs to another user, the API returns **`404`** (not `403`)
— same response as a missing id, so existence cannot be probed across users.

### 3.5 Auth flow on the frontend (recommended)

```
1. Register / Login → store token + user (id, name, email).
2. On every subsequent request, attach `Authorization: Bearer <token>`.
3. On 401 from any endpoint → clear local token, redirect to login.
4. Logout → call POST /logout, then clear local token.
```

---

## 4. Data Model — Entities, Fields & Relationships

### 4.1 Relationship diagram

```
User (1) ──< (many) Month
User (1) ──< (many) Category
Month (1) ──< (many) Expense >── (1) Category
```

- `User` has many `Month` and many `Category`.
- `Month` has many `Expense`.
- `Expense` belongs to one `Month` and one `Category`.
- `Category` and `Month` have **no direct relationship** — they meet only via
  `Expense`.
- An `Expense` has **no `user_id`** — its owner is derived through
  `expense → month → user`.

### 4.2 User

| Field        | Type / Notes                                              |
| ------------ | --------------------------------------------------------- |
| `id`         | PK                                                        |
| `name`       | string                                                    |
| `email`      | string, unique                                            |
| `password`   | hashed (bcrypt) — never returned in responses            |
| `created_at` | timestamp                                                 |
| `updated_at` | timestamp                                                 |

User responses (via `UserResource`) include only `id`, `name`, `email`, and
optionally `token` (only on register/login — **never** on `GET /user`).

### 4.3 Month

| Field           | Type / Notes                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `id`            | PK                                                                                                  |
| `user_id`       | FK → users.id (NOT NULL, `onDelete: cascade`)                                                       |
| `year`          | integer (4-digit year)                                                                              |
| `month_number`  | unsigned tiny int (1–12)                                                                            |
| `income`        | `decimal(10, 2)` — **returned as string in JSON** (e.g. `"5000.00"`)                                  |
| `savings_goal`  | `decimal(10, 2)` — string in JSON                                                                   |
| `is_active`     | boolean — guaranteed `true`/`false` in JSON (enforced via explicit `$casts` on `Month`)                        |
| `is_skipped`    | boolean, default `false` — guaranteed `true`/`false` in JSON (enforced via explicit `$casts` on `Month`)       |
| `skipped_at`    | timestamp, nullable — when the skip decision was made (ISO 8601 in JSON, or `null`)                   |
| `created_at`    | timestamp                                                                                            |
| `updated_at`    | timestamp                                                                                            |

#### Active-month rule (CRITICAL)

**Only one `Month` per user has `is_active = true` at any time** — it is the
current calendar month. The `EnsureCurrentMonthExists` middleware enforces
this on every Month/Expense route (see §8).

- **All writes** (update month, create/update/delete expense) require
  `is_active = true`. Past months are **read-only** (HTTP 403).
- A normal "past month" (`is_active = false`, `is_skipped = false`) is
  created by `POST /gaps/backfill` for past calendar months (see §7.5).
- A "skipped month" (`is_active = false`, `is_skipped = true`) is created
  by `POST /gaps/skip` (see §7.5).

### 4.4 Category

| Field          | Type / Notes                                                                                |
| -------------- | ------------------------------------------------------------------------------------------- |
| `id`           | PK                                                                                          |
| `user_id`      | FK → users.id (NOT NULL, `onDelete: cascade`)                                                |
| `name`         | string                                                                                       |
| `default_type` | enum: `fixed` \| `variable` — suggestion pre-fill; **per-expense type overrides it**          |
| `is_default`   | boolean, default `false` — true only for the 3 system-seeded categories                      |
| `deleted_at`   | timestamp, nullable — Laravel `SoftDeletes`. **Never exposed in API responses.**               |
| `created_at`   | timestamp                                                                                    |
| `updated_at`   | timestamp                                                                                    |

#### Soft-delete behaviour (CRITICAL)

Categories use Laravel `SoftDeletes`:

- **Deleting a category hides it from future selection** (dropdowns, new
  expenses) but **preserves it fully in historical data**. Past months'
  totals/breakdowns never change due to a later deletion.
- The `deleted_at` timestamp is **never returned** in API responses
  (`CategoryResource` excludes it). The category simply disappears from
  `GET /categories`.
- Soft-deleted categories **cannot be assigned to new expenses** — the
  `category_id` validation rule uses `whereNull('deleted_at')` (see §11).

### 4.5 Expense

| Field         | Type / Notes                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------- |
| `id`          | PK                                                                                            |
| `amount`      | `decimal(10, 2)` — string in JSON (e.g. `"250.00"`), enforced via `Expense` `$casts` (`decimal:2`) — verified by test |
| `date`        | `date (Y-m-d)` — e.g. `"2026-09-07"`; **format applied in `ExpenseResource`** (`->format('Y-m-d')`), not by model cast alone (bare Carbon cast serializes full ISO); model keeps `'date' => 'date'` for PHP-level Carbon validity |
| `type`        | enum: `fixed` \| `variable` — **per-expense** (same category can be different types per entry) |
| `category_id` | FK → categories.id (`onDelete: restrict`)                                                     |
| `month_id`    | FK → months.id (`onDelete: restrict`) — set by controller, never by user input                 |
| `created_at`  | timestamp                                                                                      |
| `updated_at`  | timestamp                                                                                      |

#### Important expense facts

- `month_id` is **not fillable on the model**. The controller sets it from the
  URL parameter (`POST /months/{monthId}/expenses`) and rejects writes to
  non-active months.
- The frontend never sends `month_id` in the body — it's implicit in the URL.
- The `type` is **per expense**, not per category. A "Food" category might
  have a `fixed` expense (grocery subscription) and a `variable` expense
  (eating out) in the same month.

### 4.6 Personal access tokens (Sanctum)

The frontend does not see this table. It just needs to know that issued
tokens persist in DB until explicitly deleted via `POST /logout`.

---

## 5. Business Rules the Frontend Must Respect

These rules are **load-bearing** for the API. The frontend must enforce or
respect them in the UI — bypassing them will produce 403/422 errors.

1. **Money fields are `decimal(10,2)` and serialized as strings in JSON.**
   Compare with `String()` not `Number()` to avoid float drift.

2. **Calculated values are always computed by the backend.** The client must
   not recompute totals locally as the source of truth. Use `GET
   /months/{id}/summary` (see §10) and trust what it returns.

3. **The category type (`fixed`/`variable`) lives on the Expense, not the
   Category.** `Category.default_type` is only a suggestion/pre-fill. The
   frontend should expose a `type` selector on the expense form, not assume
   the category determines it.

4. **Categories are soft-deleted.** Deleting a category:
   - removes it from `GET /categories` lists,
   - prevents it from being assigned to future expenses,
   - **does not** change any historical month summary or breakdown.

5. **Only the active month accepts writes.** Frontend rules:
   - Editable inputs (income, savings goal, expenses) should be enabled only
     on the active month.
   - Past and skipped months are **read-only** in the UI.
   - Sending PUT to a past month → `403 Cannot update a past month`.
   - Sending POST to a past month → `403 Cannot add expense to a past month`.

6. **Auto month creation is server-side.** The frontend never POSTs to create
   a month — the first hit to any Month/Expense route creates the current
   month if missing. (See §8.)

7. **Expense `date` defaults to today.** If the user doesn't supply a date,
   the server uses `now()`. The frontend can either send an explicit date or
   omit the field for "today".

8. **Skipped months are a one-shot decision.** There is no "un-skip"
   endpoint. The frontend should make this clear before letting the user
   confirm.

9. **Skipped months return nulls in their summary.** The frontend should
   render them distinctly (e.g. "March 2026 — Skipped") rather than blank or
   zero totals.

10. **Categories are per-user.** The frontend must never show another user's
    categories, and must not assume categories exist globally. The 3 default
    categories are seeded per-user at registration — a new user always sees
    `Electricity`, `Gas`, `Water` immediately.

11. **404 vs 403 vs 422 semantics:**
    - `404` = "no such resource you can see" (does not exist OR belongs to
      someone else — same response either way).
    - `403` = "exists, belongs to you, but you cannot write to it" (e.g.
      past month).
    - `422` = "request shape is invalid" (validation failed) **OR** business
      conflict (e.g. trying to backfill/skip a month that already has a row).

---

## 6. API Resources — Response Shapes

Every successful response on a resource endpoint is shaped by a Laravel API
Resource class. The frontend should rely on these shapes exactly.

### 6.1 `UserResource` — used by `register`, `login`, `GET /user`

```json
{
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "token": "1|abcxyz..."   // only present on register/login
  }
}
```

- `token` is **omitted entirely** on `GET /user` (returns null/MissingValue,
  stripped by Laravel).
- Excluded fields: `password`, `remember_token`, `email_verified_at`,
  `created_at`, `updated_at`.

### 6.2 `MonthResource` — used by `GET /months`, `GET /months/{id}`,
`PUT /months/{id}`, `POST /gaps/backfill`, `POST /gaps/skip`

```json
{
  "data": {
    "id": 1,
    "year": 2026,
    "month_number": 9,
    "income": "5000.00",
    "savings_goal": "1000.00",
    "is_active": true,                    // JSON boolean true (guaranteed by $casts)
    "is_skipped": false,                 // JSON boolean false (guaranteed by $casts)
    "skipped_at": null,                  // ISO 8601 string when not null
    "created_at": "2026-09-01T12:00:00+00:00",
    "updated_at": "2026-09-01T12:00:00+00:00"
  }
}
```

> **JSON boolean guarantee:** Both `is_active` and `is_skipped` declare
> explicit `$casts = ['is_active' => 'boolean', 'is_skipped' => 'boolean']`
> on `Month`. They serialize consistently as JSON `true`/`false` regardless
> of whether the row was created by middleware (`forceCreate`) or controller.
> The frontend can rely on `is_bool()` and strict equality (`=== true`).
>
> **Audit outcome (other models):** `Category` (`is_default` boolean) and
> `Expense` (`amount` decimal:2, `date` date) also received explicit
> `$casts` arrays in the same fix — no serialization inconsistency
> remains across any model.

- Excluded: `user_id` (implicit via auth).
- No relationships included by default.
- For backfilled months: `is_active: false`, `is_skipped: false`,
  `skipped_at: null`.
- For skipped months: `is_active: false`, `is_skipped: true`,
  `skipped_at: "<ISO 8601>"`, `income: 0`, `savings_goal: 0`.

### 6.3 `MonthSummaryResource` — used by `GET /months/{id}/summary`

#### 6.3.1 Normal month

```json
{
  "data": {
    "income": "5000.00",
    "savings_goal": "1000.00",
    "total_spent": "2750.00",
    "remaining": "2250.00",
    "available_to_spend": "4000.00",
    "is_overspent": false,
    "spending_by_category": [
      { "category_name": "Food", "total": "1500.00" },
      { "category_name": "Electricity", "total": "1250.00" }
    ]
  }
}
```

- All monetary fields are **strings** (`decimal(10,2)` cast).
- `remaining = income − total_spent` (can be negative).
- `available_to_spend = income − savings_goal` (the "budget" for the month).
- `is_overspent = total_spent > available_to_spend`.
- `spending_by_category` is an array of `{ category_name, total }` objects,
  grouped by category name (joining through `expenses.category_id`).
- **No `is_skipped` or `skipped_at` keys** on normal months (omitted from
  output).

#### 6.3.2 Skipped month (CRITICAL — different shape)

```json
{
  "data": {
    "is_skipped": true,
    "skipped_at": "2026-09-02T12:34:56+00:00",
    "income": null,
    "savings_goal": null,
    "total_spent": null,
    "remaining": null,
    "available_to_spend": null,
    "is_overspent": null,
    "spending_by_category": []
  }
}
```

- All numeric fields become `null`. `spending_by_category` becomes `[]`.
- The shape decision is made in the resource layer (`MonthSummaryResource`),
  not the model.
- Frontend must **branch on `is_skipped === true`** before trying to
  display totals — otherwise it will show "0" / "NaN" / null weirdness.

### 6.4 `CategoryResource` — used by `GET /categories`, `POST /categories`,
`PUT /categories/{id}`

```json
{
  "data": {
    "id": 1,
    "name": "Food",
    "default_type": "variable",
    "is_default": false,
    "created_at": "2026-09-01T12:00:00+00:00",
    "updated_at": "2026-09-01T12:00:00+00:00"
  }
}
```

- Excluded: `user_id`, `deleted_at` (soft-delete is invisible to the
  client — deleted categories simply disappear from `GET /categories`).
- For system-seeded defaults, `is_default: true` and
  `default_type: "fixed"`.

### 6.5 `ExpenseResource` — used by `GET /months/{id}/expenses`,
`POST /months/{id}/expenses`, `GET /expenses/{id}`, `PUT /expenses/{id}`

```json
{
  "data": {
    "id": 1,
    "amount": "150.00",
    "date": "2026-09-07",
    "type": "variable",
    "category_id": 5,
    "month_id": 1,
    "created_at": "2026-09-07T10:00:00+00:00",
    "updated_at": "2026-09-07T10:00:00+00:00"
    // "category": { ... } only present when the controller eager-loads it.
  }
}
```

- `date` format (`Y-m-d`) is enforced by the `ExpenseResource` (`$this->date->format('Y-m-d')`), not by the model $casts alone. Changing this requires editing the Resource, not the cast.
- `category_id` and `month_id` are FK ids.
- An embedded `category` object is **only present** if the controller
  eager-loaded the relationship via `->with('category')`. In the current
  backend, **no endpoint currently eager-loads it** — the frontend gets
  `category_id` and must look up the category separately (or call the
  future endpoint that eager-loads it). The shape is documented here for
  when that endpoint is added.

---

## 7. Endpoints Reference (by Controller)

### 7.1 Auth

#### `POST /api/register`

- **Auth:** none.
- **Request body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }
  ```
- **Validation:** `name` required string, `email` required + valid + unique,
  `password` required + `min:8` + `confirmed`.
- **Side-effects:** creates user, seeds 3 default categories
  (`Electricity`, `Gas`, `Water` — all `default_type: fixed`,
  `is_default: true`), issues Sanctum token.
- **Response:** `201` with `{ "data": { "id", "name", "email", "token" } }`.
- **Errors:** `422` on validation failure.

#### `POST /api/login`

- **Auth:** none.
- **Request body:**
  ```json
  { "email": "jane@example.com", "password": "password123" }
  ```
- **Validation:** `email` required + valid, `password` required string.
- **Response:** `200` with `{ "data": { "id", "name", "email", "token" } }`.
- **Errors:** `401 { "message": "Invalid credentials" }` for wrong
  email/password; `422` on validation failure.

#### `POST /api/logout`

- **Auth:** required (sanctum bearer).
- **Body:** none.
- **Side-effects:** deletes the **current** Sanctum token only.
- **Response:** `200 { "message": "Logged out successfully" }`.
- **Errors:** `401` if no token.

#### `GET /api/user`

- **Auth:** required.
- **Response:** `200 { "data": { "id", "name", "email" } }` — **no
  `token` field**.
- **Errors:** `401` if no token.

---

### 7.2 Months

All month routes require `auth:sanctum` and pass through the
`ensure.month` middleware (which auto-creates the current month on the
fly — see §8).

#### `GET /api/months`

- Lists **all** months for the authenticated user, regardless of state
  (active, past, backfilled, skipped).
- Response: `200 { "data": [ { month... }, { month... } ] }`.
- The frontend should treat this as the **full timeline**, ordered by
  `year` + `month_number` if needed (the backend does not guarantee
  order — sort on the client).

#### `GET /api/months/{id}`

- Returns a single month.
- Response: `200 { "data": { ...month... } }`.
- Errors: `404 { "message": "Month not found" }` (also for other
  users' months).

#### `PUT /api/months/{id}`

- **Only the active month can be updated.** Past months return `403`.
- **Request body:**
  ```json
  { "income": 5000.00, "savings_goal": 1000.00 }
  ```
- **Validation:** both `income` and `savings_goal` required + numeric.
- Response: `200 { "data": { ...month... } }` with updated values.
- Errors:
  - `404` if month not found / not owned.
  - `403 { "message": "Cannot update a past month" }` if not active.
  - `422` on validation failure.

> No `POST /api/months` and no `DELETE /api/months/{id}` exist. Months are
> exclusively created by the middleware (current) or by `POST /gaps/*`
> (past months).

#### `GET /api/months/{id}/summary`

- Returns computed totals for a single month (see §10).
- Response shape depends on whether the month is skipped (see §6.3).
- Errors: `404` if month not found / not owned.

---

### 7.3 Categories

All category routes require `auth:sanctum`. **The `ensure.month`
middleware is NOT applied** here — categories are independent of months.

#### `GET /api/categories`

- Lists **all non-deleted** categories for the authenticated user.
- Response: `200 { "data": [ ... ] }` (empty `data` if none).
- Soft-deleted categories are excluded automatically (Laravel
  `SoftDeletes` global scope).

#### `POST /api/categories`

- **Request body:**
  ```json
  { "name": "Food", "default_type": "variable" }
  ```
- **Validation:** `name` required string, `default_type` required +
  `in:fixed,variable`.
- Side-effects: creates a category scoped to the authenticated user
  (`is_default` defaults to `false`).
- Response: `201 { "data": { ...category... } }`.
- Errors: `422` on validation failure.

#### `PUT /api/categories/{id}`

- **Request body:** same as `POST`.
- Response: `200 { "data": { ...category... } }`.
- Errors: `404 { "message": "Category not found" }`, `422` on validation.

#### `DELETE /api/categories/{id}`

- **Soft-delete.** Removes the category from `GET /categories` and
  prevents it from being assigned to future expenses.
- Response: `200 { "message": "deleted successfully" }` (note: **no
  `data` wrapper**, this is a message-only response).
- Errors: `404` if not found / not owned.

---

### 7.4 Expenses

All expense routes require `auth:sanctum`. Routes nested under a month
also pass through `ensure.month` so the current month always exists.

#### `GET /api/expenses/{id}`

- Response: `200 { "data": { ...expense... } }`.
- Errors: `404 { "message": "Expense not found" }`.

#### `PUT /api/expenses/{id}`

- **Only the active month's expenses can be updated.** Otherwise `403`.
- **Request body:**
  ```json
  {
    "amount": 150.00,
    "date": "2026-09-07",        // optional; defaults to today if omitted
    "type": "variable",
    "category_id": 5
  }
  ```
- **Validation:**
  - `amount` required + numeric.
  - `date` nullable + date.
  - `type` required + string (in practice always `fixed` or `variable`).
  - `category_id` required + must exist **for the current user** and
    **not be soft-deleted**:
    `Rule::exists('categories','id')->where('user_id', auth()->id())->whereNull('deleted_at')`.
- Response: `200 { "data": { ...expense... } }`.
- Errors: `404` not found / not owned, `403 { "message": "Cannot update
  an expense from a past month" }`, `422` on validation.

#### `DELETE /api/expenses/{id}`

- **Hard delete.** Only on the active month.
- Response: `200 { "message": "Expense deleted successfully" }` (no
  `data` wrapper).
- Errors: `404`, `403 { "message": "Cannot delete an expense from a
  past month" }`.

#### `GET /api/months/{monthId}/expenses`

- Lists all expenses for the given month (past or active — read-only for
  past months).
- The month must belong to the authenticated user, otherwise `404`.
- Response: `200 { "data": [ ...expenses... ] }` (empty array if none).
- **No pagination** is implemented. For the data sizes expected
  (personal monthly expenses), the full list is returned.

#### `POST /api/months/{monthId}/expenses`

- **Only the active month accepts new expenses.** Otherwise `403`.
- **Request body:**
  ```json
  {
    "amount": 150.00,
    "date": "2026-09-07",        // optional; defaults to today
    "type": "variable",
    "category_id": 5
  }
  ```
- **Validation:** identical to `PUT /expenses/{id}`.
- The `month_id` is set from the URL parameter, **never from the
  request body**.
- Response: `201 { "data": { ...expense... } }`.
- Errors: `404` (month not found), `403 { "message": "Cannot add
  expense to a past month" }`, `422` on validation.

---

### 7.5 Gaps (Skipped-Months Backfill/Skip)

All gap routes require `auth:sanctum` and the `ensure.month` middleware
so the current month always exists before gaps are computed.

#### `GET /api/gaps`

- Returns the months between the user's earliest and current month that
  have **no row** in `months` for the user.
- **Response shape (NOT wrapped in `data`):**
  ```json
  {
    "gaps": [
      { "year": 2026, "month_number": 3, "label": "March 2026" },
      { "year": 2026, "month_number": 4, "label": "April 2026" }
    ]
  }
  }
  ```
- **Algorithm:**
  1. Find user's earliest `Month` (smallest `year`, then `month_number`).
  2. If none exists → empty `gaps: []` (brand-new user).
  3. Enumerate every month from earliest to current (`now()` start of
     month, inclusive).
  4. Drop months that have any row for the user (normal OR skipped).
  5. The current month is included in step 3 but excluded in step 4
     because the middleware ensured it has a row.
  6. Return the remainder.
- **Edge cases:**
  - Brand-new user with no months at all → `gaps: []`.
  - User whose earliest month IS the current month → `gaps: []`.
  - Months with `is_skipped: true` are excluded (they already have a
    row, no action needed).
- **Use case:** Frontend should call this on the dashboard / month list
  to prompt the user about detected gaps.

#### `POST /api/gaps/backfill`

- Creates a **normal** (non-skipped) past month for the user, completing
  a gap.
- **Request body:**
  ```json
  {
    "year": 2026,
    "month_number": 3,
    "income": 5000.00,
    "savings_goal": 1000.00
  }
  ```
- **Validation:**
  - `year` required + integer + `min:2000` + `max:2099`.
  - `month_number` required + integer + `min:1` + `max:12`.
  - `income` required + numeric + `min:0`.
  - `savings_goal` required + numeric + `min:0`.
- **Server-side eligibility check** (after validation): the specified
  `(year, month_number)` must not already have a row for the user.
- **Created month:** `is_active: false`, `is_skipped: false`,
  `user_id: <auth user>`, `skipped_at: null`.
- **Response:** `201 { "data": { ...month... } }`.
- **Errors:**
  - `422 { "message": "This month already exists" }` if a row exists
    (covers: trying to backfill a skipped month, a normal past month,
    or the current active month).
  - `422` on validation failure.

> Backfilled months are still **read-only** (`is_active: false`). The
> user adds expenses separately via `POST /months/{id}/expenses` after
> backfilling — but those will fail with `403` because the backfilled
> month is not active. The frontend must communicate this: **backfilling
> is for recording past totals only, not for adding expenses.**

#### `POST /api/gaps/skip`

- Creates a **skipped** month for the user, marking the gap as
  intentionally not tracked.
- **Request body:**
  ```json
  { "year": 2026, "month_number": 3 }
  ```
- **Validation:** same year/month_number rules as backfill.
- **Server-side eligibility check:** same as backfill — month must not
  already have a row.
- **Created month:** `is_active: false`, `is_skipped: true`,
  `skipped_at: now()`, `income: 0`, `savings_goal: 0`,
  `user_id: <auth user>`.
- **Response:** `201 { "data": { ...month... } }`.
- **Errors:** `422` for "This month already exists" or validation.

> **One-shot rule:** Once a month is skipped, it stays skipped forever
> (no API to "un-skip"). Make the confirmation clear in the UI.

---

## 8. The "Current Month" Middleware — Auto-Creation

### 8.1 What it does

`EnsureCurrentMonthExists` (aliased as `ensure.month`) runs on every
Month, Expense, and Gap route. Its job is to guarantee the user's
**current calendar month** has a row in the `months` table before any
controller logic runs.

### 8.2 Behaviour

1. If no `auth()->user()` (shouldn't happen inside auth middleware, but
   it's defensive), it passes through.
2. Otherwise it checks `users.months` for a row matching
   `year = now()->year` and `month_number = now()->month`.
3. If absent, it creates one:
   - `income` and `savings_goal` copied from the user's previously active
     month, **or** `0` if no previous month exists (first-ever use).
   - `is_active = true`, `user_id = auth user`.
   - Any previously active month is set to `is_active = false` (so only
     one row has `is_active = true`).
4. The request proceeds.

### 8.3 Frontend implications

- A brand-new user who hits `GET /api/months` will get exactly one row
  back (the auto-created current month).
- The user **never** needs to POST to create a month. The first request
  to `/api/months*` or `/api/expenses*` triggers creation.
- If the user is brand-new (no prior month), the auto-created month
  starts with `income: 0`, `savings_goal: 0` — the frontend should
  prompt them to set these immediately (`PUT /api/months/{id}`).
- A user switching from one calendar month to the next (e.g. they last
  logged in August, returns in September) — the middleware creates
  September's row with the same `income`/`savings_goal` as August, and
  deactivates August. The frontend should be ready to receive the new
  active month on any month-list call.

---

## 9. Skipped Months & Gap Handling

### 9.1 What skipped months are

A user may have a month where they simply didn't track expenses (e.g.
they took a 2-month break from the app). Rather than represent this as
missing data, the API supports **explicitly skipping** a gap.

- A skipped month has `is_skipped: true`, `income: 0`, `savings_goal: 0`.
- It appears in `GET /api/months` alongside normal months (full timeline
  is preserved).
- Its summary returns **nulls** for all numeric fields and `[]` for
  `spending_by_category`.
- It is **not editable** (`is_active: false` — past month).

### 9.2 Detecting gaps (`GET /api/gaps`)

The frontend should call `GET /api/gaps` whenever it shows the month
list, and prompt the user about any detected gaps:

- For each gap, ask: "Did you mean to track March 2026? You can
  **backfill** it (provide income/savings goal) or **skip** it (mark as
  intentionally not tracked)."
- Use the provided `label` field (e.g. `"March 2026"`) for display.

### 9.3 Backfill vs Skip decision

| User intent              | Endpoint           | Created month has                                  |
| ------------------------ | ------------------ | -------------------------------------------------- |
| "I tracked it, just late" | `POST /gaps/backfill` | `is_skipped: false`, with income + savings_goal     |
| "I didn't track it at all" | `POST /gaps/skip`     | `is_skipped: true`, all zeros, `skipped_at: now`    |

### 9.4 Skipped months in the UI

Recommended display rules:

- Show them in the month list with a "Skipped" badge or muted style.
- In the summary view, replace numeric panels with "This month was
  intentionally skipped on <skipped_at>".
- Do **not** offer any "un-skip" or "edit" affordance.

### 9.5 No take-backs

The API has no endpoint to convert a skipped month to a normal month
(or vice versa). The frontend must communicate this irreversibility
before submission.

---

## 10. Calculated Values (Month Summary)

`GET /api/months/{id}/summary` returns a computed snapshot for one
month. The frontend should always fetch this for the active month view
and for any past-month detail view.

### 10.1 Formulas

```
total_spent        = SUM(expenses.amount) for expenses where month_id = {id}
remaining          = income − total_spent
available_to_spend = income − savings_goal
is_overspent       = total_spent > available_to_spend
spending_by_category = expenses JOIN categories ON category_id
                       GROUP BY categories.name
                       → [ { category_name: "...", total: <sum> }, ... ]
```

### 10.2 Soft-deleted categories in `spending_by_category`

The query joins through `categories` table directly (not via the
`belongsTo Category` relationship's global soft-delete scope). This means
**soft-deleted categories still appear** in `spending_by_category` for
historical expenses — which is the desired behaviour (history must not
change when a category is later deleted).

### 10.3 Skipped month behaviour (recap)

When `is_skipped: true`:
- `income`, `savings_goal`, `total_spent`, `remaining`,
  `available_to_spend`, `is_overspent` → `null`.
- `spending_by_category` → `[]`.
- `is_skipped: true` and `skipped_at: "<ISO 8601>"` keys are added.

### 10.4 No caching headers / no pagination

The summary endpoint is stateless and not paginated. The frontend
should cache results in memory per page view but **always refetch**
when the user navigates back, since data may have changed.

---

## 11. Validation Rules by Endpoint

This table is exhaustive based on the current controllers.

| Endpoint                       | Field            | Rules                                                          |
| ------------------------------ | ---------------- | -------------------------------------------------------------- |
| `POST /api/register`           | `name`           | required, string                                               |
|                                | `email`          | required, email, unique in `users`                             |
|                                | `password`       | required, min:8, confirmed                                     |
| `POST /api/login`              | `email`          | required, email                                                |
|                                | `password`       | required, string                                               |
| `PUT /api/months/{id}`         | `income`         | required, numeric                                              |
|                                | `savings_goal`   | required, numeric                                              |
| `POST /api/gaps/backfill`      | `year`           | required, integer, min:2000, max:2099                          |
|                                | `month_number`   | required, integer, min:1, max:12                               |
|                                | `income`         | required, numeric, min:0                                       |
|                                | `savings_goal`   | required, numeric, min:0                                       |
| `POST /api/gaps/skip`          | `year`           | required, integer, min:2000, max:2099                          |
|                                | `month_number`   | required, integer, min:1, max:12                               |
| `POST /api/categories`         | `name`           | required, string                                               |
|                                | `default_type`   | required, string, in:fixed,variable                            |
| `PUT /api/categories/{id}`     | `name`           | required, string                                               |
|                                | `default_type`   | required, string, in:fixed,variable                            |
| `POST /api/months/{id}/expenses`| `amount`        | required, numeric                                              |
|                                | `date`           | nullable, date                                                 |
|                                | `type`           | required, string                                               |
|                                | `category_id`    | required, must exist in `categories` for current user AND not soft-deleted |
| `PUT /api/expenses/{id}`       | same as `POST /api/months/{id}/expenses`                       |

> All validation failures return `422` with `{ "message": "...", "errors":
> { field: [messages] } }`.

---

## 12. Error Responses — Status Codes & Messages

The frontend can reliably match on these exact messages.

### 12.1 Auth errors

| Status | Body                                          | Trigger                                |
| ------ | --------------------------------------------- | -------------------------------------- |
| 401    | `{"message":"Unauthenticated."}`              | No bearer token / invalid token         |
| 401    | `{"message":"Invalid credentials"}`           | Login: wrong email or password         |

### 12.2 Month errors

| Status | Body                                                  | Trigger                                  |
| ------ | ----------------------------------------------------- | ---------------------------------------- |
| 404    | `{"message":"Month not found"}`                       | GET/PUT/summary on missing/foreign id     |
| 403    | `{"message":"Cannot update a past month"}`            | PUT on a non-active month                 |

### 12.3 Category errors

| Status | Body                                                  | Trigger                                  |
| ------ | ----------------------------------------------------- | ---------------------------------------- |
| 404    | `{"message":"Category not found"}`                    | PUT/DELETE on missing/foreign id          |

### 12.4 Expense errors

| Status | Body                                                          | Trigger                                  |
| ------ | ------------------------------------------------------------- | ---------------------------------------- |
| 404    | `{"message":"Month not found"}`                               | POST/GET expenses under missing/foreign month |
| 404    | `{"message":"Expense not found"}`                             | GET/PUT/DELETE on missing/foreign expense |
| 403    | `{"message":"Cannot add expense to a past month"}`            | POST expense to non-active month          |
| 403    | `{"message":"Cannot update an expense from a past month"}`    | PUT expense in non-active month           |
| 403    | `{"message":"Cannot delete an expense from a past month"}`    | DELETE expense in non-active month        |

### 12.5 Gap errors

| Status | Body                                                  | Trigger                                            |
| ------ | ----------------------------------------------------- | -------------------------------------------------- |
| 422    | `{"message":"This month already exists"}`             | backfill/skip a month that already has a row        |
| 422    | (Laravel validation shape)                            | bad input                                           |

### 12.6 Validation errors

Any `422` triggered by Laravel's validator returns:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

---

## 13. Edge Cases & Frontend Implications

### 13.1 First-time user flow

- Register → receive user + token.
- User has 3 default categories immediately (Electricity, Gas, Water).
- User has **no months yet**. Any call to `GET /api/months`,
  `GET /api/months/{id}/summary`, or any expense route will trigger the
  middleware to create the current month (`income: 0`,
  `savings_goal: 0`, `is_active: true`).
- Frontend should immediately prompt the user to set income/savings
  goal via `PUT /api/months/{currentMonthId}`.

### 13.2 Cross-month transitions

- When the calendar rolls over (e.g. last visit was August, now
  September), the next hit to a Month/Expense route will:
  - Auto-create September with August's income/savings_goal.
  - Deactivate August.
- Frontend should refresh `GET /api/months` on app open to pick up the
  new active month.

### 13.3 Skipped month summary shape switch

- A summary endpoint returns different shapes based on `is_skipped`.
- The frontend must check `data.is_skipped` **before** rendering any
  numeric field, otherwise `null` will appear as text and break
  calculations/display.

### 13.4 Decimal-as-string

- Money fields arrive as strings (`"5000.00"`, `"250.00"`), enforced via
  explicit `decimal:2` casts on `Month.income`/`savings_goal` and `Expense.amount`
  — verified by test, not just a Laravel default. This is a guaranteed
  contract; compare with `String()` not `Number()` to avoid float drift.

### 13.5 Category type suggestion vs. expense type

- `Category.default_type` is a **suggestion**. The frontend should use
  it as the default value in a new-expense form's type selector but
  always allow override.
- The same category can appear as `fixed` in one expense and
  `variable` in another — never assume.

### 13.6 Soft-deleted categories

- They disappear from `GET /api/categories` but historical expenses
  still reference them via `category_id`.
- If the frontend needs to display a soft-deleted category name
  (e.g. in a past month breakdown), it must look it up from a snapshot
  stored locally, or rely on the backend's `spending_by_category` which
  still includes the name (the join is on raw table, not soft-delete
  scoped — see §10.2).

### 13.7 404 hides cross-user existence

- Returning 404 for "belongs to another user" prevents users from
  probing IDs. The frontend cannot and should not try to distinguish
  "missing" from "foreign" — both are `404 { message: "X not found" }`.

### 13.8 No pagination

- All list endpoints return full collections. Acceptable for personal
  data volumes (a few years of monthly expenses). If the frontend
  anticipates growth, implement client-side pagination/virtualization.

### 13.9 Token lifetime

- Sanctum tokens never expire automatically. They live until the user
  explicitly logs out (which deletes only the current token) or until
  the DB row is removed. There is no refresh-token mechanism — the
  user just logs in again on 401.

### 13.10 No CORS pre-configured

- The frontend will likely need CORS headers to call the API from a
  different origin. This is an infrastructure concern; check Laravel's
  `config/cors.php` (default `allowed_origins` is `['*']` for the API
  via Laravel 11 defaults — but verify before deployment).

---

## 14. What Is Intentionally NOT in the Backend

These capabilities do **not** exist. The frontend must not assume them
and must not try to call endpoints that aren't documented here.

- **No `/api/expenses` index endpoint.** All expense lists are nested
  under a month (`GET /api/months/{monthId}/expenses`).
- **No `POST /api/months`.** Months are created exclusively by the
  middleware (current) or `POST /api/gaps/*` (past).
- **No `DELETE /api/months/{id}`.** Not exposed. Skipped months are
  permanent tombstones.
- **No `PATCH`** is used — only `PUT` for updates.
- **No file uploads / attachments** on expenses.
- **No multi-currency.** All money is implicit single currency; the
  field is just `amount`.
- **No email verification.** `email_verified_at` is not used.
- **No password reset / change endpoints.** Not implemented.
- **No "un-skip" endpoint.** Skipped months are permanent.
- **No bulk operations** for expenses, categories, or gaps.
- **No aggregation endpoints** beyond `/months/{id}/summary`. There is
  no yearly report, no category trend endpoint, no global stats.
- **No filtering/sorting params** on any list endpoint — the backend
  returns everything in DB order.
- **No optimistic locking / ETags.** Last-write-wins by default.
- **No rate limiting** documented in routes/middleware.
- **No websockets / push notifications.**
- **No embedded `category` object on expenses** in current
  responses (despite `ExpenseResource` supporting it via
  `whenLoaded`). The frontend must join client-side.
- **No `User` CRUD** — only register/login/logout/user.
- **No categories "restore" / "show deleted" endpoint.** Soft-deleted
  categories are not retrievable via API.

---

## 15. Quick Reference — Frontend Behaviour Cheat Sheet

A condensed lookup table for the most common frontend decisions.

### 15.1 What endpoints to call when

| User action                          | Endpoint(s) to call                                              |
| ------------------------------------ | ---------------------------------------------------------------- |
| Sign up                              | `POST /api/register`                                              |
| Sign in                              | `POST /api/login`                                                 |
| Sign out                             | `POST /api/logout`                                                |
| Open app / refresh                   | `GET /api/user` (verify token), `GET /api/months`                 |
| Show month list (with skipped)       | `GET /api/months`                                                 |
| Detect gaps to prompt user           | `GET /api/gaps`                                                   |
| Resolve a gap (backfill)             | `POST /api/gaps/backfill`                                          |
| Resolve a gap (skip)                 | `POST /api/gaps/skip`                                              |
| View month summary                   | `GET /api/months/{id}/summary`                                     |
| Edit active month income/savings     | `PUT /api/months/{id}` (only if `is_active === true`)              |
| Show expense list for a month        | `GET /api/months/{monthId}/expenses`                               |
| Add expense                          | `POST /api/months/{monthId}/expenses` (only if `is_active === true`) |
| Edit expense                         | `PUT /api/expenses/{id}` (only if expense's month is active)       |
| Delete expense                       | `DELETE /api/expenses/{id}` (only if expense's month is active)    |
| Show category list                   | `GET /api/categories`                                              |
| Create category                      | `POST /api/categories`                                             |
| Edit category                        | `PUT /api/categories/{id}`                                         |
| Delete category                      | `DELETE /api/categories/{id}`                                      |

### 15.2 What to render for each month state

| State                                | UI hint                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `is_active === true`, `is_skipped === false` | Current month — full edit + summary                       |
| `is_active === false`, `is_skipped === false` | Past month — read-only, show summary                       |
| `is_active === false`, `is_skipped === true`  | Skipped — read-only, "Skipped" badge, summary has nulls  |

### 15.3 Response unwrapping pattern (pseudocode)

```js
// Almost everything:
const data = response.data.data;

// Special cases:
const gaps = response.data.gaps;        // GET /api/gaps
const msg = response.data.message;       // POST /api/logout, DELETE /categories/{id}, DELETE /expenses/{id}
```

### 15.4 Token handling pattern (pseudocode)

```js
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### 15.5 Money formatting

Money fields arrive as strings (`"5000.00"`). Format with
`Intl.NumberFormat` for the user's locale. **Always parse to number
before doing math, and round/format for display only.**

---

## Appendix A — Full Endpoint List (Quick Lookup)

```
POST   /api/register                       (public)     → 201 { data: { id, name, email, token } }
POST   /api/login                          (public)     → 200 { data: { id, name, email, token } }
POST   /api/logout                         (sanctum)    → 200 { message: "Logged out successfully" }
GET    /api/user                           (sanctum)    → 200 { data: { id, name, email } }

GET    /api/months                         (sanctum + ensure.month)
GET    /api/months/{id}                    (sanctum + ensure.month)
PUT    /api/months/{id}                    (sanctum + ensure.month) — active only
GET    /api/months/{id}/summary            (sanctum + ensure.month)

GET    /api/categories                     (sanctum)
POST   /api/categories                     (sanctum)
PUT    /api/categories/{id}                (sanctum)
DELETE /api/categories/{id}                (sanctum) — soft delete

GET    /api/expenses/{id}                  (sanctum)
PUT    /api/expenses/{id}                  (sanctum) — active month only
DELETE /api/expenses/{id}                  (sanctum) — active month only
GET    /api/months/{monthId}/expenses      (sanctum + ensure.month)
POST   /api/months/{monthId}/expenses      (sanctum + ensure.month) — active only

GET    /api/gaps                           (sanctum + ensure.month) → { gaps: [...] }
POST   /api/gaps/backfill                  (sanctum + ensure.month)
POST   /api/gaps/skip                      (sanctum + ensure.month)
```

---

## Appendix B — Source-of-Truth Mapping

If you need to verify any behaviour above, here is where each decision
lives in the backend:

| Concern                            | Backend file / doc                                                  |
| ---------------------------------- | ------------------------------------------------------------------- |
| Data model                         | `docs/PROJECT_MEMORY.md` §2, `database/migrations/*`                |
| Auth flow + scoping                | `docs/AUTH_FEATURE_DESIGN.md`, `app/Http/Controllers/AuthController.php` |
| Resource response shapes           | `docs/API_RESOURCES_FEATURE_DESIGN.md`, `app/Http/Resources/*`       |
| Active-month rule                  | `app/Http/Controllers/MonthController.php`, `ExpenseController.php`  |
| Current-month auto-creation        | `app/Http/Middleware/EnsureCurrentMonthExists.php`                  |
| Skipped months / gaps              | `docs/SKIPPED_MONTHS_FEATURE_DESIGN.md`, `app/Http/Controllers/GapController.php` |
| Soft-deletes (categories)          | `app/Models/Category.php`, `database/migrations/..._modify_categories_table_soft_deletes.php` |
| Decimal serialization as string    | Explicit `decimal:2` cast (`Month`, `Expense`) — verified by test         |
| 404 vs 403 vs 422 semantics        | Project memory + controllers (see §12 above)                         |

---

**End of document.** This is the contract the frontend should design
against. If the backend changes, this file must be updated alongside it.
