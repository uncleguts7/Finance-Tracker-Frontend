# Feature Design — API Resources

> Companion doc to PROJECT_MEMORY.md. Documents the design reasoning for
> introducing Laravel API Resource classes to the Personal Finance Tracker API.
> Read PROJECT_MEMORY.md first for full system context.

---

## 1. Problem

Every controller currently returns raw model JSON via
`response()->json($model)`. This has three concrete consequences:

1. **No control over response shape.** Every database column is automatically
   exposed, including internal or non-user-facing fields (e.g. the
   `is_default` flag, `user_id` FK, future internal columns).
2. **No presentation layer.** Business decisions about *what* to expose
   (e.g. skipped months returning nulls, hiding `deleted_at` on soft-deleted
   categories) are tangled into the **model** layer (`Month::summary()`
   hand-rolls the null shape), making the model responsible for both
   computation and presentation.
3. **Inconsistent response shape.** Single-resource responses are flat
   objects, list responses are flat arrays, and auth responses have a
   hand-rolled `{ "user": {...}, "token": "..." }` shape — three different
   conventions for three different endpoints.

API Resources fix all three by introducing a dedicated transformation layer
between model and JSON.

---

## 2. Goals

- **Centralise response shape** in one place per model type. A new column on
  `Month` is exposed in `MonthResource` only — no audit of every controller.
- **Move presentation logic out of the model.** The skipped-month null shape
  moves from `Month::summary()` into `MonthSummaryResource`. The model
  becomes pure computation; the resource becomes pure presentation.
- **Standardise wrapping.** All successful responses follow Laravel's
  `data`-key convention (`{ "data": ... }` for single resources,
  `{ "data": [...] }` for collections).
- **Enable conditional relationships** via `whenLoaded()` — a controller
  eager-loads a relationship when it wants it in the JSON; otherwise it's
  omitted.
- **Keep the auth response clean.** The Sanctum token sits inside the `data`
  wrapper via a fluent `withToken()` helper on `UserResource`, rather than
  living as a sibling key outside `data`.

---

## 3. Resource Classes

Five resource classes total. Located at `app/Http/Resources/`.

### 3.1 `UserResource`

| Field | Source | Notes |
|---|---|---|
| `id` | `$this->id` | |
| `name` | `$this->name` | |
| `email` | `$this->email` | |
| `created_at` | `$this->created_at` | ISO 8601 timestamp |
| `token` | conditional via `withToken()` | Only present when the controller explicitly sets it (register, login, password change). Absent from `GET /user` and `PUT /user`. |

Excluded by design: `password`, `remember_token`, `email_verified_at`,
`updated_at` — not relevant to the auth response.

The `token` field is implemented via a private property + fluent setter:

```php
class UserResource extends JsonResource
{
    private ?string $accessToken = null;

    public function withToken(string $token): static
    {
        $this->accessToken = $token;
        return $this;
    }

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at?->toIso8601String(),
            'token' => $this->when(
                $this->accessToken !== null,
                fn () => $this->accessToken,
            ),
        ];
    }
}
```

When `$this->accessToken` is `null` (the default), `when()` returns a
`MissingValue` that Laravel strips from the output — so `GET /user` returns
`{ "data": { "id": 1, "name": "...", "email": "..." } }` with no `token`
key at all.

### 3.2 `MonthResource`

| Field | Source | Notes |
|---|---|---|
| `id` | `$this->id` | |
| `year` | `$this->year` | |
| `month_number` | `$this->month_number` | |
| `income` | `$this->income` | Decimal — string in JSON (Laravel cast) |
| `savings_goal` | `$this->savings_goal` | Decimal — string in JSON |
| `is_active` | `$this->is_active` | |
| `is_skipped` | `$this->is_skipped` | |
| `skipped_at` | `$this->skipped_at` | ISO 8601 timestamp, or `null` |
| `created_at` | `$this->created_at` | ISO 8601 timestamp |
| `updated_at` | `$this->updated_at` | ISO 8601 timestamp |

Excluded by design: `user_id` — already enforced via the ownership scoping
pattern (every month returned is implicitly the current user's; exposing the
FK adds noise without information).

No relationships are included by default. The summary (computed fields) is
a separate resource — see `MonthSummaryResource` (§3.5).

### 3.3 `CategoryResource`

| Field | Source | Notes |
|---|---|---|
| `id` | `$this->id` | |
| `name` | `$this->name` | |
| `default_type` | `$this->default_type` | Enum: `fixed` \| `variable` |
| `is_default` | `$this->is_default` | Boolean badge for system-seeded categories |
| `created_at` | `$this->created_at` | ISO 8601 timestamp |
| `updated_at` | `$this->updated_at` | ISO 8601 timestamp |

Excluded by design: `user_id` (same reasoning as `MonthResource`),
`deleted_at` (internal — soft-delete behaviour is already enforced via
query scoping; the timestamp itself is not useful to clients).

No relationships included by default. Categories listing all of a user's
expenses would be expensive and rarely useful — the inverse (expense →
category) is the common direction and is handled in `ExpenseResource`.

### 3.4 `ExpenseResource`

| Field | Source | Notes |
|---|---|---|
| `id` | `$this->id` | |
| `amount` | `$this->amount` | Decimal — string in JSON |
| `date` | `$this->date` | `Y-m-d` (date column, ISO format) |
| `type` | `$this->type` | Enum: `fixed` \| `variable` |
| `category_id` | `$this->category_id` | FK |
| `month_id` | `$this->month_id` | FK |
| `created_at` | `$this->created_at` | ISO 8601 |
| `updated_at` | `$this->updated_at` | ISO 8601 |
| `category` | conditional via `whenLoaded('category')` | Embedded `CategoryResource` when the controller eager-loads the relationship |

The `category` relationship is the only relationship ever expected to be
eager-loaded. Controllers that want it should use
`->with('category')->find($id)`; otherwise the field is absent from the
JSON. This keeps the common case (list/show) cheap while making the
relationship opt-in for endpoints that need it (e.g. a future expense
detail view).

### 3.5 `MonthSummaryResource`

A dedicated resource for the `GET /months/{id}/summary` endpoint. Owns the
**skipped-vs-normal** shape decision (moved out of `Month::summary()` — see
§6).

| Field | Source | Notes |
|---|---|---|
| `is_skipped` | `$this->is_skipped` | Only present (and `true`) when the month is skipped |
| `skipped_at` | `$this->skipped_at` | Only present when skipped |
| `income` | `$this->income` or `null` | `null` for skipped months |
| `savings_goal` | `$this->savings_goal` or `null` | `null` for skipped months |
| `total_spent` | `$this->totalSpent()` or `null` | Computed via model method |
| `remaining` | `$this->remaining()` or `null` | Computed via model method |
| `available_to_spend` | `$this->availableToSpend()` or `null` | Computed via model method |
| `is_overspent` | `$this->isOverSpent()` or `null` | Computed via model method |
| `spending_by_category` | `$this->spendingByCategory()` or `[]` | Collection — `[]` for skipped months |

Shape logic lives in the resource, not the model. See §6.

---

## 4. Response Wrapping — Laravel `data` Key

Laravel Resources default to wrapping successful responses:

- Single resource: `{ "data": { ...fields... } }`
- Collection: `{ "data": [ {...}, {...} ] }`

This applies to **every** successful response in the API. Status codes stay
the same (200 for show/update/destroy/index, 201 for create/store). Error
responses (404, 403, 422, 401) are unaffected — they continue to be
hand-rolled `response()->json(['message' => '...'], $status)` and are not
wrapped.

### Endpoints that change shape

| Endpoint | Before | After |
|---|---|---|
| `POST /register` | `{ "user": {...}, "token": "..." }` | `{ "data": { "id", "name", "email", "token" } }` |
| `POST /login` | `{ "user": {...}, "token": "..." }` | `{ "data": { "id", "name", "email", "token" } }` |
| `GET /user` | `{ "id", "name", "email", ... }` | `{ "data": { "id", "name", "email" } }` |
| `GET /months` | `[ {...}, {...} ]` | `{ "data": [ {...}, {...} ] }` |
| `GET /months/{id}` | `{ ... }` | `{ "data": { ... } }` |
| `PUT /months/{id}` | `{ ... }` | `{ "data": { ... } }` |
| `GET /months/{id}/summary` | `{ "income": ..., ... }` | `{ "data": { "income": ..., ... } }` |
| `GET /categories` | `[ {...}, {...} ]` | `{ "data": [ {...}, {...} ] }` |
| `POST /categories` | `{ ... }` | `{ "data": { ... } }` |
| `PUT /categories/{id}` | `{ ... }` | `{ "data": { ... } }` |
| `GET /months/{id}/expenses` | `[ {...}, {...} ]` | `{ "data": [ {...}, {...} ] }` |
| `POST /months/{id}/expenses` | `{ ... }` | `{ "data": { ... } }` |
| `GET /expenses/{id}` | `{ ... }` | `{ "data": { ... } }` |
| `PUT /expenses/{id}` | `{ ... }` | `{ "data": { ... } }` |
| `POST /gaps/backfill` | `{ ...month... }` | `{ "data": { ...month... } }` |
| `POST /gaps/skip` | `{ ...month... }` | `{ "data": { ...month... } }` |

### Endpoints that do NOT change

- `POST /logout` — already returns `{ "message": "..." }` (not a resource).
- `GET /gaps` — returns `{ "gaps": [...] }`, a hand-built array (not a
  model). Out of scope for this feature; could be wrapped later but no
  current need.

---

## 5. Conditional Relationships — `whenLoaded()`

Only `ExpenseResource` exposes a conditional relationship: `category`. The
pattern is opt-in — a controller that wants the embedded category must
eager-load it:

```php
// Without category (default)
$expense = Expense::whereHas('month', fn($q) =>
    $q->where('user_id', auth()->id())
)->find($id);

return new ExpenseResource($expense);
// → { "data": { "id": 1, "amount": "...", ..., "category_id": 5, "month_id": 2 } }
//   (no "category" key)

// With category
$expense = Expense::with('category')
    ->whereHas('month', fn($q) =>
        $q->where('user_id', auth()->id())
    )->find($id);

return new ExpenseResource($expense);
// → { "data": { ..., "category": { "id": 5, "name": "Food", ... } } }
```

This avoids N+1 by construction: if the controller didn't eager-load,
the relationship is just absent from the output. Clients that want
embedded category data opt into the cost; clients that just need IDs pay
nothing.

**For this feature**, no controller currently eager-loads `category` on
expenses. The mechanism is added in advance so the next endpoint that
needs it (e.g. an expense detail view) doesn't have to revisit the
resource.

---

## 6. Skipped-Month Summary — Logic Moved to the Resource

`Month::summary()` currently mixes computation and presentation: it
returns nulls and an `is_skipped: true` flag for skipped months, and the
full computed values otherwise. This works, but it means the *shape* of
the summary is decided in the model — which is the wrong layer once
resources exist.

### After this feature

**`Month` model** — pure computation. The `is_skipped` check is removed
from `summary()`. The method now always returns the computed values:

```php
public function summary(): array
{
    return [
        'income' => $this->income,
        'savings_goal' => $this->savings_goal,
        'total_spent' => $this->totalSpent(),
        'remaining' => $this->remaining(),
        'available_to_spend' => $this->availableToSpend(),
        'is_overspent' => $this->isOverSpent(),
        'spending_by_category' => $this->spendingByCategory(),
    ];
}
```

The individual helper methods (`totalSpent()`, `remaining()`, etc.) are
**unchanged** — they are still pure data accessors.

**`MonthSummaryResource`** — owns the shape decision:

```php
public function toArray($request): array
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

    // Normal months: no is_skipped/skipped_at keys in the response
    // (mirrors the current Month::summary() shape — only present when skipped)
    return [
        'income' => $this->income,
        'savings_goal' => $this->savings_goal,
        'total_spent' => $this->totalSpent(),
        'remaining' => $this->remaining(),
        'available_to_spend' => $this->availableToSpend(),
        'is_overspent' => $this->isOverSpent(),
        'spending_by_category' => $this->spendingByCategory(),
    ];
}
```

### Why split it this way

- **Model** stays focused on data ("compute the totals for this month").
- **Resource** owns the user-facing shape ("if skipped, return nulls
  with a flag"). This is presentation logic.
- The split also future-proofs the shape: if the resource layer later
  needs to drop a field, rename a key, or add pagination metadata, no
  model change is required.

### Breaking the model API

Removing the `is_skipped` branch from `Month::summary()` is a small
**breaking change** to the model's public method. The only caller of
`summary()` is `MonthController::summary()`, which is updated
simultaneously. No other model methods depend on it. No tests outside
`MonthControllerTest` reference it.

**Decision: keep `Month::summary()`.** The method is preserved as a pure
data-gathering helper (returns the computed values, no presentation
logic). After the migration, it is unused — `MonthController::summary()`
delegates straight to `MonthSummaryResource` — but it is kept for:

- Any future internal/queue/programmatic use that needs the raw values
  (e.g. a monthly report job).
- The fact that it's already tested and documented in PROJECT_MEMORY.md §2
  as the canonical "summarise a month" computation.

Deleting it would be churn for no benefit. If it stays unused past the
next major refactor, it can be revisited.

---

## 7. Controller Updates

Each controller is updated to return resources instead of raw models.
The find → check rules → validate → respond ordering is unchanged.

### 7.1 `AuthController`

```php
// register
$user = User::create([...]);
// ... seed default categories ...
$token = $user->createToken('auth-token');

return UserResource::make($user)->withToken($token->plainTextToken);
// status: 201

// login
$token = $user->createToken('auth-token');

return UserResource::make($user)->withToken($token->plainTextToken);
// status: 200

// user
return new UserResource($request->user());
// status: 200

// logout — unchanged (no resource)
```

### 7.2 `MonthController`

```php
// index
$months = auth()->user()->months()->get();
return MonthResource::collection($months);

// show
$month = auth()->user()->months()->find($id);
if (! $month) return response()->json(['message' => 'Month not found'], 404);
return new MonthResource($month);

// update
// ... unchanged existence + active checks ...
$month->update([...]);
return new MonthResource($month);

// summary
$month = auth()->user()->months()->find($id);
if (! $month) return response()->json(['message' => 'Month not found'], 404);
return new MonthSummaryResource($month);
```

`MonthController::store()` was **later removed** (see PROJECT_MEMORY.md §6).

### 7.3 `CategoryController`

```php
// index
$categories = auth()->user()->categories()->get();
return CategoryResource::collection($categories);

// store
$category = Category::forceCreate([...]);
return CategoryResource::make($category)->response()->setStatusCode(201);

// update
// ... unchanged checks ...
$category->update([...]);
return new CategoryResource($category);

// destroy — unchanged (no resource, returns message)
```

### 7.4 `ExpenseController`

```php
// index
$month = auth()->user()->months()->find($monthId);
if (! $month) return response()->json(['message' => 'Month not found'], 404);
$expenses = Expense::where('month_id', $monthId)->get();
return ExpenseResource::collection($expenses);

// show
$expense = Expense::whereHas('month', fn($q) =>
    $q->where('user_id', auth()->id())
)->find($id);
if (! $expense) return response()->json(['message' => 'Expense not found'], 404);
return new ExpenseResource($expense);

// store
// ... unchanged month + active checks + validation ...
$expense->month_id = $monthId;
$expense->save();
return ExpenseResource::make($expense)->response()->setStatusCode(201);

// update
// ... unchanged checks ...
$expense->update([...]);
return new ExpenseResource($expense);

// destroy — unchanged (returns message)
```

### 7.5 `GapController`

```php
// index — UNCHANGED. Returns { "gaps": [...] } (hand-built array, not a model).

// backfill
$month = Month::forceCreate([...]);
return MonthResource::make($month)->response()->setStatusCode(201);

// skip
$month = Month::forceCreate([...]);
return MonthResource::make($month)->response()->setStatusCode(201);
```

---

## 8. Test Impact

All 78 existing tests need updates because every successful response
shape changes. This is a substantial but mechanical change.

### Patterns to update

**1. Single-resource responses** — add `data` wrapper:

```php
// Before
$response->assertJson(['id' => 1, 'name' => '...']);
$response->assertJsonFragment(['income' => 6000]);
$response->assertJson(['message' => 'Cannot update a past month']);

// After
$response->assertJsonPath('data.id', 1);
$response->assertJsonPath('data.name', '...');
$response->assertJsonPath('data.income', 6000);
// error responses unchanged — they were never wrapped
$response->assertJson(['message' => 'Cannot update a past month']);
```

**2. Collection responses** — add `data` array wrapper:

```php
// Before
expect($response->json())->toHaveCount(2);
$response->assertJsonFragment(['year' => 2026]);

// After
expect($response->json('data'))->toHaveCount(2);
$response->assertJsonPath('data.0.year', 2026);
```

**3. Auth responses** — the `user`/`token` keys are gone:

```php
// Before
$response->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);
expect($response->json('user.email'))->toBe('jane@example.com');

// After
$response->assertJsonStructure(['data' => ['id', 'name', 'email', 'token']]);
expect($response->json('data.email'))->toBe('jane@example.com');
expect($response->json('data.token'))->toBeString()->not->toBeEmpty();

// For GET /user (no token)
$response->assertJsonStructure(['data' => ['id', 'name', 'email', 'created_at']])
    ->assertJsonMissingPath('data.token');

// For PUT /api/user (no token)
$response->assertJsonStructure(['data' => ['id', 'name', 'email', 'created_at']])
    ->assertJsonMissingPath('data.token');
```

**4. Summary responses** — wrapped in `data`:

```php
// Before
$response->assertJson(['income' => 5000, 'total_spent' => 200]);
expect($response->json('spending_by_category.0.category_name'))->toBe('Food');

// After
$response->assertJsonPath('data.income', 5000);
$response->assertJsonPath('data.total_spent', 200);
expect($response->json('data.spending_by_category.0.category_name'))->toBe('Food');
```

**5. Skipped-month summary** — shape unchanged, but wrapped in `data`:

```php
// Before
$this->actingAs($this->user)
    ->getJson("/api/months/{$month->id}/summary")
    ->assertOk()
    ->assertJson([
        'is_skipped' => true,
        'income' => null,
        'savings_goal' => null,
        'total_spent' => null,
        'remaining' => null,
        'available_to_spend' => null,
        'is_overspent' => null,
        'spending_by_category' => [],
    ]);

// After — every key now lives under data.*
$this->actingAs($this->user)
    ->getJson("/api/months/{$month->id}/summary")
    ->assertOk()
    ->assertJson([
        'data' => [
            'is_skipped' => true,
            'income' => null,
            'savings_goal' => null,
            'total_spent' => null,
            'remaining' => null,
            'available_to_spend' => null,
            'is_overspent' => null,
            'spending_by_category' => [],
        ],
    ]);
```

**6. Gap responses** — index unchanged (`{ "gaps": [...] }`).
`backfill`/`skip` get wrapped in `data`:

```php
// Before (backfill)
$response->assertCreated()->assertJsonFragment(['year' => 2026, 'month_number' => 3]);

// After
$response->assertCreated()->assertJsonPath('data.year', 2026)
    ->assertJsonPath('data.month_number', 3);
```

### Untouched tests

- All 401 / 403 / 404 / 422 / validation tests — error responses are not
  affected.
- `GET /gaps` index tests — `{ "gaps": [...] }` is unchanged.
- `POST /logout` tests — unchanged (message response, not a resource).
- All `assertDatabaseHas` / `assertDatabaseMissing` assertions — DB state
  is unchanged.

### Estimated scope

Roughly 5 test files affected, ~50–60 individual assertions updated.
The pattern is mechanical — the same `data.` prefix is added in every
place. No new tests are required; the existing coverage of business
logic (auth, scoping, validation, soft-delete, active-month rules) is
preserved.

---

## 9. Backwards Compatibility & Rollout

This is a **breaking change** to every successful response shape. There
is no current frontend consumer, so no migration coordination is
required. If/when a frontend is built, it should be designed against the
`data`-wrapped shape from the start.

**No database changes.** No migrations needed.

**No model deletions or refactors** outside `Month::summary()`'s
`is_skipped` branch (which is removed in the same commit — see §6).

---

## 10. Full List of Files Affected

### New files

| File | Purpose |
|---|---|
| `app/Http/Resources/UserResource.php` | User → JSON, with optional `token` |
| `app/Http/Resources/MonthResource.php` | Month → JSON |
| `app/Http/Resources/CategoryResource.php` | Category → JSON |
| `app/Http/Resources/ExpenseResource.php` | Expense → JSON, with optional `category` |
| `app/Http/Resources/MonthSummaryResource.php` | Month → summary JSON, owns skipped-vs-normal shape |

### Modified files

| File | Change |
|---|---|
| `app/Http/Controllers/AuthController.php` | Return `UserResource` with `withToken()` for register/login; `UserResource` for `user` |
| `app/Http/Controllers/MonthController.php` | Return `MonthResource` (index/show/update); `MonthSummaryResource` (summary) |
| `app/Http/Controllers/CategoryController.php` | Return `CategoryResource` (index/store/update); destroy unchanged |
| `app/Http/Controllers/ExpenseController.php` | Return `ExpenseResource` (index/show/store/update); destroy unchanged |
| `app/Http/Controllers/GapController.php` | `backfill`/`skip` return `MonthResource`; `index` unchanged |
| `app/Models/Month.php` | Remove `is_skipped` branch from `summary()` — pure computation now |
| `tests/Feature/AuthControllerTest.php` | Update assertions for `data`-wrapped responses |
| `tests/Feature/MonthControllerTest.php` | Update assertions for `data`-wrapped responses |
| `tests/Feature/CategoryControllerTest.php` | Update assertions for `data`-wrapped responses |
| `tests/Feature/ExpenseControllerTest.php` | Update assertions for `data`-wrapped responses |
| `tests/Feature/GapControllerTest.php` | Update `backfill`/`skip` assertions only |
| `docs/PROJECT_MEMORY.md` | Update §2 (note `Month::summary()` shape moved to resource), §7 (mark as built), §8 (remove from "what's next") |

### Unchanged

- `routes/api.php` — no route changes
- `routes/web.php` — no route changes
- `app/Http/Middleware/EnsureCurrentMonthExists.php` — no changes
- `app/Http/Controllers/MonthController::store()` — later removed (see PROJECT_MEMORY.md §6)
- `app/Models/Category.php`, `Expense.php`, `User.php` — no model changes
- `database/migrations/*` — no migrations needed
- `app/Models/Month` — only `summary()` changes; helper methods, relationships, fillable unchanged

---

## 11. Status

Design complete. Not yet built.
