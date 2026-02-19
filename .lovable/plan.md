
# Audit Findings: User Deletion Broken & Scroll Issues

## Root Cause 1 — User Deletion Failing

The `delete-user` edge function is deployed and correct in its logic, but it is **not deployed** in Supabase (no logs exist for it in the edge function logs). Additionally, the function handles most tables but is **missing cleanup for 8 tables** that have `user_id` columns. If any of these tables have rows for the user being deleted AND have a `NOT NULL` user_id constraint or a RESTRICT foreign key, `auth.admin.deleteUser()` will fail with a 500 error.

**Tables NOT handled in the current `delete-user` function that have `user_id` columns:**

| Table | `user_id` Nullable? | Risk Level |
|---|---|---|
| `analytics_events` | YES | Low (service role can nullify) |
| `application_logs` | YES | Low (nullify) |
| `customer_addresses` | **NO** | HIGH — will block deletion |
| `customer_engagement_metrics` | YES | Medium |
| `email_logs` | YES | Low |
| `email_preferences` | **NO** | HIGH — will block deletion |
| `product_reviews` | YES | Low |
| `quotes` | YES | Medium |
| `report_configurations` | **NO** | HIGH — will block deletion |
| `return_requests` | YES | Low |
| `reviews` | YES | Low |
| `trader_applications` | YES | Medium |
| `wishlists` | **NO** | HIGH — will block deletion |

The 4 tables with `NOT NULL` user_id (`customer_addresses`, `email_preferences`, `report_configurations`, `wishlists`) will **directly block** `auth.admin.deleteUser()` because Postgres cannot set those FK references to null — so the auth deletion fails.

**Also critical:** The edge function was added via GitHub PR/commit but may not have been deployed yet via Supabase. The edge function logs show **no invocations of `delete-user` ever**, which confirms it has never been successfully called.

**Fix:**
1. Add cleanup for all 8 missing tables in `delete-user/index.ts` — delete rows for tables with `NOT NULL` constraints (`customer_addresses`, `email_preferences`, `report_configurations`, `wishlists`) and nullify for nullable ones
2. Redeploy the function

---

## Root Cause 2 — Site Scroll Issues

After the previous audits, the CSS scroll situation is now as follows:

**Current state (after previous audit fixes):**
- `mobile.css` — `overflow: hidden` on `html` was removed ✅ (previous fix applied)
- `base.css` — `html` has `overflow-x: hidden` + `overscroll-behavior-y: contain`, body has `overflow-y: auto` ✅
- `App.css` — `#root` has only `overflow-x: hidden`, no `overflow-y` (correct) ✅
- `index.html` — `--vh` pre-calculated ✅

**Remaining scroll problem identified:** The `PromotionalBanners` component uses `-mt-12 xs:-mt-14 sm:-mt-16` negative margin to extend the hero under the fixed header. The `Index.tsx` renders `<Header />` which outputs both the fixed header AND a spacer `<div className="h-12 xs:h-14 sm:h-16">`. The banner then applies a matching negative margin to cancel the spacer. This is structurally correct.

**The actual scroll problem** is in `mobile.css` at line 98-109:
```css
@media screen and (max-width: 768px) {
  html, body {
    overflow-x: hidden;
    width: 100%;
  }
  main {
    overflow-y: visible;
    overflow-x: hidden;
  }
```

The `main { overflow-y: visible }` on mobile is fine by itself, BUT there is a second issue: `base.css` sets `body { overflow-y: auto }` and `overscroll-behavior-y: contain`. On iOS Safari, when `body` is the scroll container (which it is after the audit fixes), `overscroll-behavior-y: contain` **prevents pull-to-refresh but also interferes with momentum scrolling** in some iOS versions when combined with `-webkit-overflow-scrolling: touch`.

**The specific remaining problem:**
- `body { overscroll-behavior-y: contain }` in `base.css` — on older iOS Safari this can suppress momentum scroll (the "flick and glide" feel)
- `html { overscroll-behavior-y: contain }` — double-applying this on both `html` and `body` is redundant and can cause conflicts

**Fix:**
- Remove `overscroll-behavior-y: contain` from `html` in `base.css` (keep it only on `body` — that's sufficient)
- Add `overscroll-behavior: none` specifically for iOS in the `@supports (-webkit-touch-callout: none)` block in `mobile.css` — this is the correct iOS-specific pattern
- The `ScrollToTop` component uses `window.scrollTo({ top: 0, behavior: 'instant' })` plus direct `scrollTop = 0` on both `documentElement` and `body` — this is correct and should work

---

## What Will Be Fixed

### Fix A — `delete-user` edge function: Add missing table cleanups

Add these steps **before** the `auth.admin.deleteUser()` call in `supabase/functions/delete-user/index.ts`:

```
Step 10a: DELETE customer_addresses WHERE user_id = userId
Step 10b: DELETE email_preferences WHERE user_id = userId  
Step 10c: DELETE report_configurations WHERE user_id = userId
Step 10d: DELETE wishlists WHERE user_id = userId (cascade will handle wishlist_items)
Step 10e: Nullify analytics_events.user_id WHERE user_id = userId
Step 10f: Nullify application_logs.user_id WHERE user_id = userId
Step 10g: Nullify customer_engagement_metrics.user_id WHERE user_id = userId
Step 10h: Nullify email_logs.user_id WHERE user_id = userId
Step 10i: Nullify product_reviews.user_id WHERE user_id = userId (preserve reviews)
Step 10j: Nullify quotes.user_id WHERE user_id = userId (preserve quotes for records)
Step 10k: Nullify return_requests.user_id WHERE user_id = userId (preserve for records)
Step 10l: Nullify reviews.user_id WHERE user_id = userId
Step 10m: Nullify trader_applications.user_id WHERE user_id = userId (preserve apps for records)
```

Then redeploy the function.

### Fix B — CSS scroll: Remove duplicate `overscroll-behavior-y` on `html`

In `base.css`, remove `overscroll-behavior-y: contain` from the `html` rule — it is only needed on `body`. Having it on both `html` and `body` creates conflicting scroll container contexts on iOS Safari.

In `mobile.css`, within the `@supports (-webkit-touch-callout: none)` iOS block, explicitly set `body { overscroll-behavior: none; }` to fully disable iOS overscroll bounce (which was the original intent but was previously achieved via the aggressive `overflow: hidden` which broke scrolling entirely).

### Fix C — CHANGELOG and README update

Document these two fixes in `CHANGELOG.md`.

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/delete-user/index.ts` | Add 13 missing table cleanups before `auth.admin.deleteUser()` |
| `src/styles/base.css` | Remove `overscroll-behavior-y: contain` from `html` rule |
| `src/styles/mobile.css` | Add `overscroll-behavior: none` to iOS `@supports` body rule |
| `CHANGELOG.md` | Document fixes |

## What Will NOT Change

- Payment processing — untouched
- Auth flows — untouched
- The existing delete steps (orders, user_roles, cart, loyalty, wishlist_items, pending_orders, product_imports, security_audit_log, profiles) — preserved and extended
- All admin functionality other than user deletion — untouched
- Database schema — no migrations needed (using service role to bypass RLS)
