
# Complete Simultaneous Audit Fix Implementation

## Overview

All 14 audit fixes will be implemented simultaneously across 13 files. Every change is surgical — nothing that currently works will be broken. The fixes are grouped by file below with exact details of every change.

---

## Files & Changes

### 1. `index.html`
**Fix 9 — Pre-load `--vh` variable before React mounts**

Add an inline `<script>` tag in the `<head>` (before `</head>`) that sets the `--vh` CSS custom property immediately, eliminating the viewport height flash on mobile load. This runs synchronously before React paints anything.

```js
(function(){
  var vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', vh + 'px');
})();
```

Also add `html { background-color: hsl(var(--background)); }` to the existing critical CSS `<style>` block to fix iOS rubber-band overscroll background bleed (Fix 13).

---

### 2. `src/styles/mobile.css`
**Fix 1 — Remove aggressive iOS scroll lock**

The current `@supports (-webkit-touch-callout: none)` block sets `html { overflow: hidden; height: 100%; }` — this is the root cause of iOS scroll breaking. Replace with a safe version:

- Change `html { overflow: hidden; height: 100%; }` → `html { height: 100%; }` (remove `overflow: hidden`)
- Keep `body { overflow: auto; height: 100%; -webkit-overflow-scrolling: touch; }` unchanged — this is correct

This single removal unblocks iOS scrolling without affecting anything else.

---

### 3. `src/styles/base.css`
**Fix 13 — iOS rubber-band background colour**

Add `background-color: hsl(var(--background));` to the `html` rule so overscroll bounce reveals the app background colour instead of white/transparent flash.

---

### 4. `src/components/products/ProductImageGallery.tsx`
**Fix 2 — Resolve zoom/swipe touch conflict**

The fullscreen modal inner `div` has raw `onTouchStart/Move/End` handlers that run simultaneously with `fullscreenSwipe` on the outer container. The conflict occurs at `zoomLevel === 1` when both try to handle the same touch.

Changes:
- Add `e.stopPropagation()` to the inner div's `onTouchStart` when `zoomLevel > 1` so drag events don't bubble up to `fullscreenSwipe`
- Conditionally apply `touch-action: none` to the inner image div when `zoomLevel > 1` to prevent the browser passing the event to the swipe handler
- Add `touch-manipulation` class explicitly to the thumbnail `<button>` elements to remove 300ms tap delay (Fix 4 for this component)

---

### 5. `src/components/layout/MobileNav.tsx`
**Fix 3 — Fix overscroll containment + Fix 12 — Sign In CTA**

Two changes:

**Fix 3:** The root `<div>` already has `overscroll-contain` in the className but the `mobile-enhanced.css` only applies `.scrollable` to `body.touch-device` elements. Add `style={{ overscrollBehavior: 'contain' }}` directly to the root div so it applies regardless of the body class.

**Fix 12:** Change the "Sign In" button from `variant="ghost"` to `variant="default"` with `w-full` styling so it is a clear, prominent CTA in the mobile menu. This is the only sign-in affordance on mobile for non-logged-in users.

---

### 6. `src/components/layout/Header.tsx`
**Fix 3 — scroll lock unmount safety (already exists)**

Reading the code: Header already has the correct `useEffect` cleanup for `unlockBodyScroll` on unmount:
```js
return () => { unlockBodyScroll(); };
```
This fix is already implemented. No change needed here.

---

### 7. `src/components/home/PromotionalBanners.tsx`
**Fix 5 — 44px tap targets for slide indicators + Fix 11 — `aria-current`**

The indicator dots are `h-1 w-2/w-8` — only 4px tall. Fix:

- Wrap each indicator `<button>` with `py-5` padding (adds 20px top/bottom) to create a 44px invisible tap area while the visual dot stays `h-1`
- Add `aria-current={index === currentIndex ? "true" : undefined}` to each indicator button

The active indicator grows from `w-2` to `w-8` on selection — this UX is preserved exactly.

---

### 8. `src/components/home/OptimizedCategoryGrid.tsx`
**Fix 8 — Eliminate N+1 product count queries**

Currently: fetches categories → then fires one `count` query per category in `Promise.all` = 9 round trips for 8 categories.

Replace with a single aggregated query using Supabase's relational count syntax:

```ts
.from('categories')
.select('id, name, slug, description, image_url, sort_order, products!category_id(count)')
.eq('is_active', true)
```

This returns the product count as a nested `products` array with length. Map it to `product_count`. Apply same pattern to the `homepage_featured_categories` branch. Reduces 9 network calls to 1.

---

### 9. `src/components/common/WhatsAppChatWidget.tsx`
**Fix 7 — Route-aware positioning on Cart/Checkout**

Import `useLocation` from `react-router-dom`. Detect `/cart` and `/checkout` routes. When on those routes, add extra bottom margin (`mb-20 sm:mb-24`) so the widget clears the sticky checkout button that appears at the bottom of those pages on mobile.

This requires the widget to be inside the `BrowserRouter`. Currently it is rendered in `App.tsx` **outside** `<BrowserRouter>` (line 105 is before line 106). 

**Important:** Move `<WhatsAppChatWidget />` to inside `<BrowserRouter>` so `useLocation` works. It can sit just inside `<BrowserRouter>` before `<ScrollToTop />`.

---

### 10. `src/App.tsx`
**Fix 7 (cont) — Move WhatsAppChatWidget inside BrowserRouter**

Move `<WhatsAppChatWidget />` from its current position outside `<BrowserRouter>` (line 105) to inside `<BrowserRouter>` after `<ScrollToTop />` (line 107). This is a one-line move that enables `useLocation` to work in the widget.

---

### 11. `src/contexts/AudioContext.tsx`
**Fix 6 — Add fade guard ref to prevent race condition**

Add `const fadingRef = useRef(false)` to the provider. In `startFadeOut`:
- Set `fadingRef.current = true` before the `requestAnimationFrame` loop
- Inside the `fade` function, check `if (!fadingRef.current) return;` at the top of each frame
- Set `fadingRef.current = false` when the fade ends (calls `pause()`)

In `toggleMute`:
- Set `fadingRef.current = false` to stop any in-progress fade when user manually mutes

This prevents the scenario where muting mid-fade causes audible volume fluctuation.

---

### 12. `src/components/products/ProductCard.tsx` (and other cards)
**Fix 4 — touch-manipulation on interactive cards**

The product card root is a `<Link>` inside a `<Card>`. While `body { touch-action: manipulation }` is set globally in `base.css`, children with explicit scroll containers can reset this.

Add `touch-manipulation` Tailwind class to:
- The root `<Link>` in `ProductCard.tsx`
- The `<Link>` wrappers in `OptimizedCategoryGrid.tsx` (already checked — these are `<Link>` elements that will also benefit from the category grid refactor)
- The `CampaignProductCard` `<Link>` in `CampaignSection.tsx`

---

### 13. `src/contexts/CartContext.tsx` + `src/components/cart/EnhancedCartProvider.tsx`
**Fix 10 — Resolve cart provider duplication**

The audit identified that both `EnhancedCartProvider` and `useEnhancedCart` hook create a `cart_session_id`, listen to `visibilitychange`/`beforeunload`, and track cart analytics independently.

**Safe approach** — do NOT delete `EnhancedCartProvider.tsx` (it may be imported elsewhere). Instead:

- Verify `EnhancedCartProvider` is NOT in `App.tsx` as a wrapper — confirmed, it is not
- Update `CartContext.tsx` to only export `useEnhancedCart` from the hook (`@/hooks/useEnhancedCart`), removing the re-export from `EnhancedCartProvider`
- The `EnhancedCartProvider` is only used in `CartContext.tsx` as a re-export, so cleaning the re-export effectively deduplicates it

This stops double session ID creation and double abandonment tracking without deleting any files.

---

### 14. `CHANGELOG.md` + `README.md`
**Fix 14 — Document the audit**

Add a new entry to `CHANGELOG.md` under `[Unreleased]` documenting all 14 fixes from this audit session with date (Feb 18, 2026).

Update `README.md` system status section to reflect the completed audit.

---

## Implementation Order (all simultaneous)

Since all fixes are in independent files with no cross-dependencies (except the WhatsApp widget move in App.tsx which pairs with the widget file), all can be written in one pass:

```text
Pass 1 — CSS/HTML (no React deps):
  index.html              → Fix 9, Fix 13 (critical CSS)
  mobile.css              → Fix 1 (iOS overflow)
  base.css                → Fix 13 (overscroll bg)

Pass 2 — Components:
  ProductImageGallery.tsx → Fix 2, Fix 4
  MobileNav.tsx           → Fix 3, Fix 12
  PromotionalBanners.tsx  → Fix 5, Fix 11
  OptimizedCategoryGrid.tsx → Fix 8 (N+1 query)
  WhatsAppChatWidget.tsx  → Fix 7 (route-aware)
  ProductCard.tsx         → Fix 4
  CampaignSection.tsx     → Fix 4

Pass 3 — Contexts/Hooks:
  AudioContext.tsx        → Fix 6
  CartContext.tsx         → Fix 10

Pass 4 — App wiring:
  App.tsx                 → Move WhatsApp widget inside Router

Pass 5 — Docs:
  CHANGELOG.md            → Fix 14
  README.md               → Fix 14
```

## What Will NOT Change

- All Supabase queries (except OptimizedCategoryGrid which gets fewer, better ones)
- All routing logic
- All authentication flows
- All admin functionality
- All payment/checkout logic
- All existing TypeScript types
- The `EnhancedCartProvider.tsx` file itself (not deleted — only its re-export is removed from CartContext)
- Header.tsx scroll lock (already correct — no change needed)
