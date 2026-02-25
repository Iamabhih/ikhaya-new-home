

# Fix CSS Commit Issues + Add Google & Apple Sign-In

## Part 1: CSS Commit Verification

Both CSS commits (`4e93883` white premium theme, `fb0ed4c` brand styling) are mostly correctly implemented. The theme variables in `base.css`, premium utilities in `premium.css`, product cards, hero section, and CTA buttons all look correct and consistent with the OZZ brand palette.

However, there are **4 invalid Tailwind opacity values** introduced across those commits:

### Invalid Opacities Found

| File | Invalid Class | Fix |
|---|---|---|
| `src/components/layout/Header.tsx` (line 82) | `bg-white/97` | `bg-white/95` |
| `src/components/layout/Header.tsx` (line 82) | `bg-white/92` | `bg-white/90` |
| `src/components/products/ProductCard.tsx` (lines 145-146) | `bg-sale/8`, `bg-sale/12` | `bg-sale/10`, `bg-sale/15` |
| `src/components/products/ProductActions.tsx` (lines 25-26) | `bg-sale/8`, `bg-sale/12` | `bg-sale/10`, `bg-sale/15` |

Tailwind only supports opacity in increments of 5 (e.g., /5, /10, /15, /20...). Values like /8, /12, /92, /97 are silently ignored or cause build errors.

## Part 2: Google + Apple Sign-In

Add OAuth buttons to both `AuthPage.tsx` and `AuthModal.tsx`.

### Code Changes

**`src/pages/AuthPage.tsx`**: Add a social sign-in section between the Tabs component and the Separator, with:
- "Or continue with" divider
- Google button (calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`)
- Apple button (same pattern with `provider: 'apple'`)
- Styled with brand-consistent outline buttons and SVG icons

**`src/components/auth/AuthModal.tsx`**: Add matching OAuth buttons below the Tabs component, same logic.

### Manual Setup Required (by you, in external dashboards)

Before the buttons will work, you must:

1. **Google Cloud Console**: Create OAuth 2.0 credentials, set redirect URL to `https://kauostzhxqoxggwqgtym.supabase.co/auth/v1/callback`
2. **Apple Developer Console**: Create Services ID with Sign In with Apple, set same redirect URL
3. **Supabase Dashboard** (Auth > Providers): Enable Google and Apple, paste Client IDs and Secrets
4. **Supabase URL Config**: Ensure redirect URLs include `https://ozz-home.lovable.app/**`

## Files to Modify

| File | Change |
|---|---|
| `src/components/layout/Header.tsx` | Fix `bg-white/97` to `/95`, `bg-white/92` to `/90` |
| `src/components/products/ProductCard.tsx` | Fix `bg-sale/8` to `/10`, `bg-sale/12` to `/15` |
| `src/components/products/ProductActions.tsx` | Fix `bg-sale/8` to `/10`, `bg-sale/12` to `/15` |
| `src/pages/AuthPage.tsx` | Add Google + Apple OAuth buttons |
| `src/components/auth/AuthModal.tsx` | Add Google + Apple OAuth buttons |
| `CHANGELOG.md` | Document all changes |

## What Will NOT Change

- All theme variables in `base.css` and `premium.css` -- verified correct
- Product card layout, image handling, cart/wishlist logic -- untouched
- Hero section, category grid, footer -- untouched
- All admin, checkout, payment flows -- untouched

