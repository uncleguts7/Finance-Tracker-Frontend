# Feature Design — Authentication (Multi-User Support)

> Companion doc to PROJECT_MEMORY.md. Documents the design reasoning for adding
> Authentication to the Personal Finance Tracker API. Read PROJECT_MEMORY.md first
> for full system context.

---

## 1. Problem

The current API has no concept of "whose data is this" — any request can see/edit
all Months, Categories, and Expenses across all users. Authentication solves two
distinct problems:
1. **Identity** — knowing who is making a request (register/login, token issuance)
2. **Ownership/Authorization** — every user must only see/modify their own data

---

## 2. Data Model Changes

```
User (1) ──< (many) Month
User (1) ──< (many) Category
Month (1) ──< (many) Expense
Category (1) ──< (many) Expense
```

- **`months` table** → add `user_id` (FK → users.id)
- **`categories` table** → add `user_id` (FK → users.id)
- **`expenses` table** → NO CHANGE — ownership is inherited via `Expense belongsTo Month belongsTo User` (avoids duplicating a field that's derivable through an existing relationship, same principle already used for `month_id`/`category_id`).

**Categories are per-user, not global.** Rationale: this is a *personal* finance
tracker — one user's custom categories (e.g. "Gym Membership") should not appear
for other users. The 3 default categories (Electricity, Gas, Water) are seeded
individually **per user at registration**, not once globally via a database
seeder (the old `CategorySeeder` approach is now replaced by inline logic in the
registration flow).

---

## 3. Auth Mechanism

**Laravel Sanctum** (already installed via `install:api`). Token-based: login/register
return a token; the frontend sends `Authorization: Bearer {token}` on every
subsequent request.

### Endpoints
```
POST /api/register       → create user, hash password, seed 3 default categories
                             (scoped to new user), issue token, return user + token
POST /api/login          → verify credentials, issue token, return user + token
POST /api/logout         → invalidate current token (auth:sanctum required)
GET  /api/user           → return currently authenticated user (auth:sanctum required)
PUT  /api/user           → update authenticated user's name (auth:sanctum required)
PUT  /api/user/password  → change password, revoke all tokens, issue new token (auth:sanctum required)
```

### Registration validation
```php
'name' => 'required|string',
'email' => 'required|email|unique:users,email',
'password' => 'required|min:8|confirmed',
```

### Profile update validation (PUT /api/user)
```php
'name' => 'required|string|max:255',
```

### Password change validation (PUT /api/user/password)
```php
'current_password' => 'required|string',
'password' => 'required|string|min:8|confirmed',
```

### Password change flow (PUT /api/user/password)
1. Validate input (`current_password`, `password`, `password_confirmation`)
2. Verify `current_password` matches stored hash → 422 if wrong
3. Verify new password ≠ current password → 422 if same
4. Hash new password, update user
5. Revoke **all** user's existing Sanctum tokens (`$user->tokens()->delete()`)
6. Issue fresh token
7. Return user + new token

**Security rationale:** Revoking all tokens on password change is standard practice (GitHub, Google, etc.) — it ensures stolen tokens become useless immediately. The new token keeps the current session alive.

### Registration flow (in order)
1. Validate input
2. Create `User` (password hashed)
3. Seed 3 default categories for this user (`forceCreate()`, `user_id` = new
   user's id, same pattern as the old global seeder — just scoped now)
4. Issue Sanctum token
5. Return `{ user, token }`

**No new Month-creation logic needed at registration** — the existing
`EnsureCurrentMonthExists` middleware (once scoped to the authenticated user,
see below) naturally creates the user's first Month the first time they hit
any Month/Expense endpoint.

---

## 4. Scoping Pattern — the core of this feature

**Principle:** always query *through* the `auth()->user()` relationship, never
directly against the model. This makes unscoped queries structurally
impossible, rather than relying on remembering to add `where('user_id', ...)`
everywhere.

```php
// Listing
auth()->user()->months;
auth()->user()->categories;

// Find-by-id (returns null if it exists but belongs to someone else —
// same 404 response either way, so ownership can't be probed)
auth()->user()->months()->find($id);
auth()->user()->categories()->find($id);

// Create (auto-attaches user_id)
auth()->user()->months()->create([...]);
auth()->user()->categories()->create([...]);
```

**Expense is one relationship "hop" further** (no direct `user_id`), so it uses
`whereHas()` to filter through its `month` relationship *inside* the query
itself, rather than fetching first and checking ownership afterward:

```php
Expense::whereHas('month', function ($query) {
    $query->where('user_id', auth()->id());
})->find($id);
```

Same principle applied to nested `index($monthId)` / `store($monthId, ...)`:
must confirm the **month itself** belongs to the current user before listing/
creating expenses under it (not just filter by `month_id` — a user could
otherwise pass someone else's `month_id` in the URL).

---

## 5. Full Audit — every existing query that needs scoping

This is the key insight from this feature's design: **auth is not an isolated
add-on, it ripples through nearly every existing query.** Full list:

**`MonthController`**
- `index()` → `Month::all()` → `auth()->user()->months`
- `show($id)` → `Month::find($id)` → `auth()->user()->months()->find($id)`
- `update($id)` → same fix
- `summary($id)` → same fix

**`CategoryController`**
- `index()` → `Category::all()` → `auth()->user()->categories`
- `store()` → `auth()->user()->categories()->create([...])`
- `update($id)` → `auth()->user()->categories()->find($id)`
- `destroy($id)` → same fix

**`ExpenseController`**
- `index($monthId)` → verify month belongs to user first, then list its expenses
- `show($id)` → `whereHas('month', ...)` pattern
- `store($monthId, ...)` → verify month ownership; **also** update the
  `category_id` validation rule to require the category belong to the current
  user:
  ```php
  Rule::exists('categories', 'id')
      ->where('user_id', auth()->id())
      ->whereNull('deleted_at'),
  ```
- `update($id)` / `destroy($id)` → `whereHas('month', ...)` pattern

**`EnsureCurrentMonthExists` middleware**
- The `exists()` check and "find previous active month" query must both be
  scoped to `auth()->user()->months()` — previously these queried the whole
  `months` table, which would incorrectly skip creating a month for a new user
  if *any* user already had a month for the current year/month.

**All routes** (Month, Category, Expense) must be wrapped in `auth:sanctum`
middleware — currently fully open.

---

## 6. Status

Design complete. Not yet built. Once built and tested, fold a condensed
version of this into `PROJECT_MEMORY.md` §2 (data model), §3 (business rules),
and §7 (current status).
