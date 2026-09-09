# Auth Feature Design — Frontend

> Status: **design complete, not yet built**

---

## Problem Statement

The frontend needs a complete authentication flow against the Laravel Sanctum backend:
- User registration (creates account, seeds 3 default categories, returns token)
- User login (returns token)
- Token storage and attachment to all authenticated requests
- Automatic 401 handling (clear token, redirect to login)
- Logout (revoke current token, clear local state)
- Protected routes that require authentication
- Persisted auth state across page reloads

Backend contract: `Backend-System-design.md` §3, §7.1, §2.3, §2.5, §12.1.

---

## Design

### 1. Token Storage Abstraction (`lib/auth.ts`)

Single module for all token/user read/write — no scattered `localStorage` calls.

```typescript
const TOKEN_KEY = 'ft_auth_token';
const USER_KEY = 'ft_auth_user';

export function getToken(): string | null
export function setToken(token: string): void
export function clearToken(): void
export function getUser(): User | null
export function setUser(user: User): void
```

**Storage:** `localStorage` (Phase 1). Migration path to HttpOnly cookies documented in `Frontend-System-Design.md` §12.1.

### 2. API Client Interceptor (`lib/api.ts`)

- Attaches `Authorization: Bearer <getToken()>` to all requests
- Sets `Accept: application/json`
- Response interceptor:
  - Unwraps `data` (or `gaps`/`message` exceptions per §2.3)
  - On `401` → `clearToken()` + `navigate('/login', { replace: true })`
  - Throws `ApiError` with status + body for callers to handle

### 3. Auth Context (`contexts/AuthContext.tsx`)

```typescript
interface AuthContextValue {
  user: User | null;
  loading: boolean;          // true during initial hydration
  login: (email, password) => Promise<void>;
  register: (name, email, password, password_confirmation) => Promise<void>;
  logout: () => Promise<void>;
}
```

**Hydration on mount:**
1. Check `localStorage` for token
2. If present → `GET /api/user` to validate + hydrate user
3. If 401 or no token → `clearToken()`, `user = null`, `loading = false`

### 4. Protected Route Wrapper (`routes/RequireAuth.tsx`)

```tsx
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

Wraps all Phase 1 authenticated routes in `router.tsx`.

### 5. Pages & Forms

| Page | Form | Submit Action |
|------|------|---------------|
| `/login` | `LoginForm` (RHF + Zod) | `POST /api/login` → `setToken`/`setUser` → navigate `/` |
| `/register` | `RegisterForm` (RHF + Zod) | `POST /api/register` → `setToken`/`setUser` → navigate `/` |
| `/settings` | `SettingsForm` (minimal) | Logout button → `POST /api/logout` → `clearToken()` → navigate `/login` |

**Zod Schemas** mirror backend validation (§11):
- Login: `email` (required, email), `password` (required)
- Register: `name` (required), `email` (required, email, unique), `password` (required, min:8, confirmed)

### 6. Server 422 → RHF Error Mapping

On validation error (422), map Laravel `errors` object to `form.setError(field, { message })` per field. Non-field errors → form-level banner + toast.

---

## Reasoning

- **Single auth abstraction** enables future cookie migration without hunting `localStorage` calls across components.
- **401 interceptor at API client level** guarantees consistent handling — no missed redirects from forgotten checks.
- **Hydration via `GET /user`** validates the token is still valid (not revoked) before treating user as authenticated.
- **React Router `RequireAuth`** keeps route protection declarative and testable.
- **RHF + Zod** gives consistent validation UX across login/register with minimal boilerplate.

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| **In-memory token only (no persistence)** | User would re-login on every page refresh — unacceptable for a dashboard. |
| **HttpOnly cookies (Phase 1)** | Backend doesn't support cookie-based Sanctum yet; requires CORS credentials + CSRF + same-site hosting. Deferred to migration. |
| **SessionStorage instead of localStorage** | Per-tab isolation means re-login per tab; worse UX for a tool used in multiple tabs. |
| **Global store (Zustand) for auth** | Overkill — auth state is simple (user + token), React Context is sufficient. |
| **Manual `Authorization` header per call** | Error-prone, easy to forget, no central 401 handling. |

---

## Status

**Design complete, finished building.**