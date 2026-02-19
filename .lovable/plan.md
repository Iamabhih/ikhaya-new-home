
# Root Cause Diagnosis — Both Issues Confirmed

## Issue 1 — User Deletion: JWT Gateway Rejection (Config Missing)

The `delete-user` edge function logs show **boot events only — zero requests ever processed**. This means every request is being rejected by Supabase's JWT gateway *before* the Deno handler runs.

**Root cause confirmed:** `supabase/config.toml` contains only `project_id = "kauostzhxqoxggwqgtym"` — there is no `[functions.delete-user]` section with `verify_jwt = false`. 

By default, Supabase edge functions have JWT verification enabled at the gateway level. Since the `delete-user` function validates the caller *inside* the handler (using the service role client to re-verify the token and then check superadmin role), it needs `verify_jwt = false` in config so the request reaches the Deno handler at all. Currently, the gateway is rejecting the request with 401 before the handler ever executes — which is why no `[delete-user]` log lines exist beyond boot.

**Fix:** Add `[functions.delete-user]` with `verify_jwt = false` to `supabase/config.toml`, then redeploy.

```toml
[functions.delete-user]
verify_jwt = false
```

This is safe because the function performs its own auth check internally using the service role — it validates the Bearer token, confirms the caller is a real user, and then confirms they have the `superadmin` role before proceeding. The gateway-level check is redundant and blocking.

---

## Issue 2 — Scroll Locked in Admin (and Everywhere): Layout Architecture

The description — "site scrolls while loading but once page loaded, nothing scrolls until sidebar is manually moved" — pinpoints the layout container:

**Admin pages:** `AdminLayout` wraps content in:
```
<div class="min-h-screen bg-gray-50/50">           ← outer wrapper
  <Header />                                         ← fixed position
  <div class="flex flex-col lg:flex-row">            ← flex row
    <AdminSidebar class="lg:sticky lg:top-0 lg:h-screen" />  ← sticky, h-screen
    <main class="flex-1 bg-background">              ← NO overflow-y
      <div class="min-h-screen">                     ← creates extra height
```

The `AdminSidebar` has `lg:h-screen` which makes the sidebar exactly viewport height. The outer `flex lg:flex-row` div then expands to match the sidebar height (`h-screen`). The `<main>` inside has `min-h-screen` nested inside `flex-1` — this is fine. BUT the outer `.min-h-screen` wrapper div is constraining the row to exactly screen height on some browsers, which means `<main>` content cannot grow past the viewport — it clips silently.

**The real locking mechanism:** `body { overflow-y: scroll }` that was added in the previous fix is **making body the scroll container** — but `AdminLayout`'s outer div has `min-h-screen` which means the body content is exactly 100vh. There's nothing to scroll at the body level because the content is constrained to viewport height.

**On public pages:** The same `overflow-y: scroll` on body with `#root { overflow-x: hidden }` means the scroll container is body, but components with `overflow-y: auto` or `overflow: auto` inside the page can also become independent scroll containers that "steal" scrolling from the body.

**The fix — revert to the proven working approach:**

1. Body: revert `overflow-y: scroll` back to `overflow-y: auto` — using `scroll` was wrong; it caused body to always render a scrollbar container which interferes with the layout height calculations.

2. AdminLayout: Remove the outer `min-h-screen` wrapper that constrains height. Let the flex row grow naturally. The `min-h-screen` should only be on the inner content area — not on the outer flex container.

3. AdminSidebar: Change `lg:h-screen` to `lg:min-h-screen` — this lets the sidebar grow with content if content is taller than viewport, but the sticky positioning still works correctly for short content.

4. Global: Change `html { overflow-y: hidden }` — actually `html` has no `overflow-y` set currently (the previous fix removed it from the html rule). Keep it that way. The only remaining issue is `body { overflow-y: scroll }` which needs to go back to `overflow-y: auto`.

**Summary of scroll fixes:**
- `base.css`: `overflow-y: scroll` → `overflow-y: auto` on body
- `AdminLayout.tsx`: Remove `min-h-screen` from outer wrapper div (keep it only on main content div)
- `AdminSidebar.tsx`: `lg:h-screen` → `lg:min-h-screen` so sidebar doesn't constrain flex row height

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/config.toml` | Add `[functions.delete-user]` with `verify_jwt = false` |
| `src/styles/base.css` | Revert `overflow-y: scroll` back to `overflow-y: auto` on body |
| `src/components/admin/AdminLayout.tsx` | Remove `min-h-screen` from outer wrapper; keep on inner `<main>` content only |
| `src/components/admin/AdminSidebar.tsx` | Change `lg:h-screen` to `lg:min-h-screen` |
| `CHANGELOG.md` | Document root causes and fixes |

## What Will NOT Change

- The delete-user cleanup logic (all 14+ table steps) — preserved exactly
- The explicit `Authorization` header passing in `UserManagement.tsx` — preserved
- Payment processing — untouched
- All auth flows — untouched
- Public page layout (Header, Footer, page components) — untouched

## Deployment

After `config.toml` is updated, `delete-user` will be redeployed immediately. The function already has correct logic — the only missing piece was the gateway config.
