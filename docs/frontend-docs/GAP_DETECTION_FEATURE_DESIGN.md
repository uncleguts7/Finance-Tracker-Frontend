# Gap Detection & Backfill/Skip Feature Design — Frontend

> Status: **design complete, not yet built**

---

## Problem Statement

Phase 2 feature: Detect and resolve gaps in the user's month timeline.
- **Gap** = calendar month between earliest and current month with no `Month` row (§7.5, §9.2)
- **Detection:** `GET /api/gaps` → `{ gaps: [{ year, month_number, label }, ...] }`
- **Resolution per gap:** Backfill (create normal month with income/savings) OR Skip (create skipped tombstone)
- **Skip is irreversible** — no "un-skip" endpoint (§9.5)

Backend contract: `Backend-System-design.md` §7.5, §9, §6.3.2 (skipped summary shape), §12.5 (gap errors).

---

## Design

### 1. Detection & Dashboard Banner (`GapBanner.tsx`)

**Query:** `useQuery({ queryKey: ['gaps'], queryFn: api.getGaps })` — runs on `DashboardPage` mount.

**Banner renders when `gaps.length > 0`:**
```
┌────────────────────────────────────────────────────────────────┐
│ ⚠ You have 2 untracked months: March 2026, April 2026          │
│                                                                │
│ [ Resolve gaps ]  [ Dismiss for this session ]                 │
└────────────────────────────────────────────────────────────────┘
```

- **Dismiss** = hide banner until next browser session (no `localStorage` flag). Query cache retains gaps.
- **Persistent nav indicator:** Sidebar link `"Gaps (2)"` with badge — always visible, click → `/gaps`.
- **Resolve** button → navigate to `/gaps` (dedicated resolution screen).

### 2. Gap Resolution Screen (`/gaps` → `GapsPage.tsx`)

```
<GapsPage>
  <PageHeader>
    <h1>Untracked Months</h1>
    <p>These months have no data. Choose to backfill or skip each one.</p>
  </PageHeader>
  <GapList gaps={gaps} />
</GapsPage>
```

**GapList row per gap:**
```
┌────────────────────────────────────────────────────────────┐
│ March 2026                          [ Backfill ] [ Skip ]  │
└────────────────────────────────────────────────────────────┘
```

- Uses `gap.label` for display (e.g. "March 2026")
- Actions disabled while mutation pending

### 3. Backfill Modal

**Trigger:** Click "Backfill" on a gap row.

**Modal fields (pre-filled `year`, `month_number` from gap):**
- `income` (number, min 0, required)
- `savings_goal` (number, min 0, required)

**Zod schema:**
```typescript
export const gapBackfillSchema = z.object({
  year: z.number().int().min(2000).max(2099),
  month_number: z.number().int().min(1).max(12),
  income: z.number().min(0, 'Income cannot be negative'),
  savings_goal: z.number().min(0, 'Savings goal cannot be negative'),
});
```

**Submit:** `POST /api/gaps/backfill` with `{ year, month_number, income, savings_goal }`

**On success:**
- Invalidate `['months']`, `['gaps']`
- Toast "Month backfilled"
- Modal closes
- Dashboard banner updates (gap count decreases)

**Errors:**
- 422 "This month already exists" → form banner + toast (race condition: another tab resolved it)
- Validation errors → field-level RHF errors

### 4. Skip Flow (Two-Step Confirm)

**Step 1:** Click "Skip" on gap row → opens confirm modal.

**Step 2 — Confirm Modal:**
```
┌────────────────────────────────────────────────────────────┐
│ Really skip March 2026?                                    │
│                                                            │
│ This is permanent — no un-skip, no backfill later.        │
│ Income, savings, and all spending will show as null.      │
│                                                            │
│ [ Cancel ]  [ Yes, skip permanently ]                     │
└────────────────────────────────────────────────────────────┘
```

- **No checkbox** — two-step pattern reduces wrong-month mistakes (Decision 7)
- **Deferred enhancement (not Phase 2):** Show user's recent average income here for concrete context.

**Confirm action:** `POST /api/gaps/skip` with `{ year, month_number }`

**On success:**
- Invalidate `['months']`, `['gaps']`
- Toast "Month skipped"
- Modal closes
- Dashboard banner updates

### 5. Skipped Month Display (All Phases)

**Month list (`GET /months`):**
- Row shows `"March 2026"` + Badge `"Skipped"` (muted: `bg-neutral-100 text-neutral-500`)

**Month summary (`GET /months/{id}/summary` for skipped month):**
```json
{
  "is_skipped": true,
  "skipped_at": "2026-03-01T12:00:00Z",
  "income": null,
  "savings_goal": null,
  "total_spent": null,
  "remaining": null,
  "available_to_spend": null,
  "is_overspent": null,
  "spending_by_category": []
}
```

**Dashboard / Month Detail render:**
```tsx
if (summary.is_skipped) {
  return (
    <div className="text-center py-12 text-neutral-500">
      <p>This month was intentionally skipped on {formatDate(summary.skipped_at)}</p>
      <p className="text-sm mt-2">No income, savings, or spending recorded.</p>
    </div>
  );
}
```
- **No numeric cards, no expense list, no category breakdown**
- **No "edit" or "un-skip" affordance anywhere**

### 6. Invalidation Strategy

| Mutation | Invalidated Keys |
|----------|------------------|
| `POST /gaps/backfill` | `['months']`, `['gaps']` |
| `POST /gaps/skip` | `['months']`, `['gaps']` |

**NOT** `['summary', ...]` — skipped/backfilled months are past months (`is_active: false`); their summaries are only fetched when explicitly viewed.

### 7. Loading, Error, Empty States

| State | Pattern |
|-------|---------|
| **Gaps query loading** | Skeleton in banner area (shimmer line) |
| **Gaps query error** | Banner shows `"Could not check for gaps. [Retry]"` |
| **Backfill/Skip submitting** | Button disabled, spinner, `aria-busy` |
| **Backfill validation error** | Field-level errors + form banner + toast |
| **Skip confirm error (422)** | Toast "This month already exists" |
| **No gaps** | No banner rendered; "Gaps" nav link hidden (or badge "0") |

### 8. Visual Direction Applied

Per `Frontend-System-Design.md` §10:
- Banner: `bg-amber-50 border border-amber-200 rounded-lg p-4`
- Skip confirm dialog: `bg-white border border-neutral-200 rounded-lg p-6`
- Danger button (skip confirm): `bg-red-600 hover:bg-red-700 text-white`
- Skipped badge: `bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full text-xs`
- Resolve button: primary (blue)

---

## Reasoning

- **Session-only dismiss** — gaps are data integrity issues; hiding forever loses awareness. Nav badge ensures discoverability.
- **Two-step skip confirm** — reduces "wrong month" mistakes better than checkbox (Decision 7). Explicit "permanent" language matches backend irreversibility.
- **Backfill creates read-only month** — backend sets `is_active: false`; user adds expenses separately but they'll 403. Banner text clarifies: "Backfilling is for recording past totals only, not for adding expenses."
- **Single `GET /gaps` on dashboard** — cheap check, no waterfall. Phase 2 only (Decision 2b).
- **No summary invalidation** — gaps resolve past months; active month summary unaffected.

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| **Modal on load (Decision 6A)** | Blocks core workflow; feels like nagware. User should control timing. |
| **Dedicated page only (Decision 6C)** | Too hidden; users wouldn't notice gaps. Banner + nav badge = visible but non-blocking. |
| **Checkbox confirm for skip (Decision 7A)** | Checkbox gets reflexively checked; two-step with month name in confirm reduces wrong-month errors. |
| **Typed "SKIP" confirm (Decision 7C)** | High friction, accessibility issues, annoying for legitimate skips. |
| **Permanent dismiss (localStorage flag)** | Gaps can silently vanish from awareness forever. Session-only + nav badge preserves discoverability. |
| **Allow "un-skip"** | Backend has no endpoint (§9.5); would require backend change. |

---

## Status

**Design complete, not yet built.**