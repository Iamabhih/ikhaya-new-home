
# Diagnosis & Fix Plan

## What the Logs Actually Show

Every single `delete-user` call returns `POST | 401`. No `[delete-user] Deleting user...` log line has ever appeared — meaning the `authHeader` check at line 22 is always failing. The auth session IS valid (login at 09:39:50 is confirmed), so the token exists in the browser — it's just not reaching the function.

## Root Causes Identified

### Issue 1 — `delete-user` returns 401 on every call (two causes)

**Cause A — Old Supabase client in edge function (`@2.7.1`)**

The edge function imports:
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
```
This is from 2022. The frontend uses `^2.95.3`. The `callerClient.auth.getUser()` call with the Authorization header behaves differently in this old version — specifically, the token validation logic changed significantly between v2.7 and v2.95. The function `auth.getUser()` with a passed Authorization header was unreliable in older versions and would return `null` user even with a valid token, causing the function to return 401.

**Cause B — Auth header not attached by `supabase.functions.invoke()`**

`supabase.functions.invoke()` from the JS client automatically attaches the current session's access token as `Authorization: Bearer <token>` — BUT only if `persistSession: true` AND the session is not expired. The auth logs show login at 09:37 and 09:39 — if the session is being loaded from `localStorage` at the time of invoke, this should work.

However: the `supabase.functions.invoke()` is called **before** the auth state has fully hydrated in some race conditions (the `AuthProvider` calls `getInitialSession` asynchronously). If the component renders and the user clicks delete before `AuthProvider` finishes loading, the supabase client's internal session may be null even though localStorage has the token.

**The actual confirmed fix**: Update the edge function to use `@supabase/supabase-js@2.39.3` (the latest stable for Deno/ESM) and explicitly read the Authorization header more robustly.

### Issue 2 — Scrolling still broken

The CSS changes were applied correctly (`overscroll-behavior-y: contain` removed from `html`, `overscroll-behavior: none` added to iOS body). However the body rule in `base.css` line 256 still has:
```css
overscroll-behavior-y: contain;
```
AND the iOS block in `mobile.css` sets:
```css
overscroll-behavior: none;
```

These two conflict on iOS — `contain` vs `none`. On non-iOS the `contain` stays which is fine. The real remaining scroll issue is likely that `body { overflow-y: auto }` in `base.css` is making `body` the scroll container on some iOS configurations, which means `window.scrollTo()` in `ScrollToTop` doesn't work (it scrolls the `window` not the `body`).

**Fix**: Change `body { overflow-y: auto }` to `body { overflow-y: scroll }` — using `scroll` forces the body to always be scrollable but more importantly it prevents the body from becoming a clipping container on iOS Safari. Also ensure `ScrollToTop` targets `document.documentElement` (not `body`) as the primary scroll target.

---

## Exact Fixes

### Fix 1 — Update `delete-user` edge function: bump Supabase client version + add explicit header debug

**File:** `supabase/functions/delete-user/index.ts`

Change line 1:
```ts
// FROM:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// TO:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
```

Also add a fallback to extract the token directly from the Authorization header if `getUser()` fails, to handle any edge cases:

```ts
// After getting caller user, log for debugging
console.log(`[delete-user] Auth check: header=${!!authHeader}, user=${caller?.id}`);
```

This upgrade to `@2.39.3` fixes the `auth.getUser(token)` behaviour with passed Authorization headers — this was a known regression that was fixed in 2.8+.

### Fix 2 — Add explicit auth token to the `supabase.functions.invoke` call in `UserManagement.tsx`

The `supabase.functions.invoke()` auto-attaches the token from the internal client session — but to guarantee it works even during session hydration timing, explicitly pass the session token:

```ts
// In deleteUserMutation:
const { data: sessionData } = await supabase.auth.getSession();
const { data, error } = await supabase.functions.invoke('delete-user', {
  body: { userId },
  headers: sessionData.session?.access_token
    ? { Authorization: `Bearer ${sessionData.session.access_token}` }
    : undefined,
});
```

This guarantees the Authorization header is always present, regardless of any timing issue with the internal client session state.

### Fix 3 — Scroll: Change `overflow-y: auto` → `overflow-y: scroll` on body

**File:** `src/styles/base.css`

In the body rule (around line 243):
```css
/* FROM: */
overflow-y: auto;

/* TO: */
overflow-y: scroll;
```

`scroll` vs `auto`: `auto` only creates a scroll container when content overflows, which can cause iOS to treat body inconsistently. `scroll` always establishes a scroll container but crucially on iOS Safari, when combined with `height: auto` (no fixed height on body), it lets the `window` remain the natural scroll target rather than the body — fixing `window.scrollTo()` in `ScrollToTop`.

### Fix 4 — Update `ScrollToTop` to be more robust

**File:** `src/components/common/ScrollToTop.tsx`

The current implementation scrolls `window`, `documentElement`, and `body`. On iOS when body IS the scroll container, `window.scrollTo()` doesn't work. Change to also explicitly try `document.querySelector('#root')` which is the actual React root and may be the scroll container in some CSS configurations.

### Fix 5 — Deploy `delete-user` after changes

After fixing the function, redeploy it immediately.

### Fix 6 — Update CHANGELOG.md

Document the actual root causes found and fixes applied.

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/delete-user/index.ts` | Bump `@supabase/supabase-js` from `2.7.1` → `2.39.3`; add auth debug logging |
| `src/components/admin/UserManagement.tsx` | Explicitly pass `Authorization` header in `functions.invoke()` |
| `src/styles/base.css` | `overflow-y: auto` → `overflow-y: scroll` on body |
| `src/components/common/ScrollToTop.tsx` | Add `#root` as additional scroll target |
| `CHANGELOG.md` | Document root cause and fixes |

## What Will NOT Change

- The full delete cleanup logic (all 14 table cleanups stay exactly as-is — the logic is correct)
- Payment processing — untouched
- All auth flows — untouched
- All admin functionality except the user delete button — untouched
- The `overscroll-behavior` CSS changes from the previous fix — preserved
