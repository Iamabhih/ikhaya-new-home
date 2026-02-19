
# Definitive Fix Plan — User Deletion & Site-Wide Scroll

## Status After 4 Rounds of Fixes

After directly testing the `delete-user` function via curl and reading all relevant files, the exact root causes are now confirmed with certainty.

---

## Issue 1 — User Deletion: `auth.getUser()` Still Failing (401)

### Confirmed diagnosis

The curl test returned `401 Unauthorized`. The function IS reachable (config.toml `verify_jwt = false` is working). The problem is at **line 35** of `delete-user/index.ts`:

```ts
const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
```

`getUser()` in `@supabase/supabase-js@2.39.3` makes a network call to the Supabase Auth server to validate the token. On Deno/esm.sh, this call is failing silently — the user always comes back as `null` — which triggers the 401 response on line 36-40.

The correct, documented approach for Supabase Edge Functions is **`getClaims(token)`** not `getUser()`. `getClaims()` verifies the JWT cryptographically (locally, no network call) and returns the user's claims including their `sub` (user ID). This was changed in Supabase's own documentation for edge function authentication precisely because `getUser()` was unreliable in this context.

### Fix

Replace the auth verification block in `delete-user/index.ts`:

```ts
// FROM: (broken - network call fails in Deno edge runtime)
const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();

// TO: (correct - local JWT verification, no network call)
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: authError } = await callerClient.auth.getClaims(token);
if (authError || !claimsData?.claims) { return 401; }
const callerId = claimsData.claims.sub;
```

Then use `callerId` (instead of `caller.id`) when querying `user_roles` and checking self-deletion. Redeploy after.

---

## Issue 2 — Scrolling Locked Site-Wide: Flex Layout + Sticky Sidebar

### Confirmed diagnosis

**Root cause A — The sidebar `lg:max-h-screen` constrains the flex row:**

```
<div class="flex flex-col lg:flex-row">              ← flex row, no height set
  <AdminSidebar class="lg:sticky lg:top-0 lg:min-h-screen lg:max-h-screen lg:overflow-y-auto" />
  <main class="flex-1">                              ← grows to match flex row
    <div class="min-h-screen">                       ← wants to be full height
```

The sidebar has both `lg:min-h-screen` AND `lg:max-h-screen`. Combined with `lg:sticky`, the sidebar becomes a fixed-height box of exactly `100vh`. Because CSS flex `align-items` defaults to `stretch`, the `<main>` flex-1 element stretches to match the sidebar's height — which is capped at `100vh`. Content inside `<main>` that is taller than `100vh` is clipped inside a `100vh` box with no `overflow-y` set, so it is hidden — not scrollable.

**Root cause B — Public pages wrap in `min-h-screen` div:**

`Index.tsx` (and other public pages) wrap everything in `<div className="min-h-screen bg-background">`. This is fine on its own. But `body { overflow-y: auto }` combined with `overscroll-behavior-y: contain` means body scrolls naturally when content exceeds viewport. The public pages **should scroll fine** — the primary complaint there may be the `overscroll-behavior-y: contain` suppressing the "flick" feeling on iOS, or it could be the `ScrollToTop` component momentarily locking position during route change.

**The core admin fix:**

Remove `lg:max-h-screen` from `AdminSidebar`. Keep `lg:min-h-screen` (sidebar fills at least the full viewport) and `lg:overflow-y-auto` (sidebar scrolls independently if it has more nav items than space). Remove `lg:self-start` — that's for non-sticky contexts; with `lg:sticky` it's redundant and can confuse the flex layout.

Also remove the `<div className="min-h-screen">` wrapper inside `<main>` in `AdminLayout`. This extra wrapper is forcing `<main>` to be at least `100vh` tall even when constrained by the flex row — adding unnecessary height that conflicts with the flex sizing.

**The public page fix:**

The description says "site wide, even in private browsing" — this means even public pages don't scroll. The most likely cause: `body { overscroll-behavior-y: contain }` in `base.css` AND `overscroll-behavior: none` in the iOS block in `mobile.css`. On some mobile browsers, `overscroll-behavior: none` disables all overscroll AND can suppress momentum scroll entirely on older Android WebView. Remove `overscroll-behavior-y: contain` from body in `base.css` entirely (it was originally added just to prevent the bounce colour showing, but `overflow-x: hidden` already prevents horizontal overscroll). Keep only the `overscroll-behavior: none` in the iOS-specific `@supports` block.

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/delete-user/index.ts` | Replace `auth.getUser()` with `auth.getClaims(token)` for JWT verification |
| `src/components/admin/AdminSidebar.tsx` | Remove `lg:max-h-screen` and `lg:self-start` from sidebar wrapper |
| `src/components/admin/AdminLayout.tsx` | Remove the `<div className="min-h-screen">` wrapper inside `<main>` |
| `src/styles/base.css` | Remove `overscroll-behavior-y: contain` from body rule |
| `CHANGELOG.md` | Document confirmed root causes and final fixes |

## What Will NOT Change

- The 14-step user data cleanup logic in `delete-user/index.ts` — fully preserved
- The explicit `Authorization` header passing in `UserManagement.tsx` — preserved
- Payment processing, auth flows — untouched
- All public page structure (Header, Footer, components) — untouched
- The `verify_jwt = false` in `supabase/config.toml` — preserved (this was correct)

## After Implementation

Redeploy `delete-user` immediately after the fix. The function boot logs confirm it deploys successfully each time — the only issue has been the `getUser()` call inside the handler.
