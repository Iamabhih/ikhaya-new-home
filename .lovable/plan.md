
# Stability Fixes and Best Practices for Order and Product Management

## Issues Found

### 1. Campaign override_price NOT used in two checkout paths
**Critical bug**: The campaign price fix was applied to `useCart.ts` and `OrderSummary.tsx`, but two other places still use `item.product.price` directly, ignoring `override_price`:

- **`useCheckout.ts` line 31**: `subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)` -- always uses original price
- **`PayfastPayment.tsx` line 286**: `R {(item.product?.price * item.quantity).toFixed(2)}` -- display in PayFast summary shows original price

### 2. Confirmation email uses original price in process-order
**Bug**: The email line items (lines 316-321) use `item.product?.price` instead of `item.override_price ?? item.product?.price`. Customer receives email showing original price while they paid the campaign price.

### 3. clearCart query missing await on filter chain
**Potential bug**: In `useCart.ts` lines 228-234, the `clearCart` mutation builds a query with `.delete()` then conditionally adds `.eq()` filters, but the filter methods are called on the query variable without reassignment. In Supabase JS v2, filter methods return a new builder -- the original `query` variable is not mutated. This means the delete may execute without the user/session filter, potentially deleting ALL cart items.

### 4. No stock validation on the client before add-to-cart
Products can be added to cart regardless of available stock quantity -- the stock check only happens at order creation time. Users may fill a cart and discover at checkout that items are out of stock.

## Plan

### Step 1: Fix useCheckout.ts subtotal calculation
Update line 31 to use `item.override_price ?? item.product.price` so the subtotal respects campaign discounts.

### Step 2: Fix PayfastPayment.tsx display line items
Update line 286 to use `item.override_price ?? item.product?.price` so the PayFast summary shows the correct discounted price.

### Step 3: Fix process-order email line items
Update lines 316-321 in the edge function to prefer `override_price` over `product.price` in the email data, matching the order items mapping already done earlier in the same file.

### Step 4: Fix clearCart query chain in useCart.ts
Rewrite the clearCart mutation to properly chain the query builder so filters are not lost. Use a proper chained approach instead of mutating a variable.

### Step 5: Add client-side stock check in addToCart
Before inserting/updating cart items, fetch the product's `stock_quantity` and validate the requested quantity does not exceed it. Show a user-friendly toast if stock is insufficient.

### Step 6: Update CHANGELOG
Document all stability fixes.

## Files to Modify

| File | Change |
|---|---|
| `src/hooks/useCheckout.ts` | Use override_price in subtotal calculation |
| `src/components/checkout/PayfastPayment.tsx` | Use override_price in line item display |
| `supabase/functions/process-order/index.ts` | Use override_price in email line items |
| `src/hooks/useCart.ts` | Fix clearCart query chain; add stock validation |
| `CHANGELOG.md` | Document fixes |

## What Will NOT Change
- Product form, admin UI, product management -- untouched
- Payment webhook processing -- untouched
- RLS policies -- untouched
- Cart analytics, wishlist, search -- untouched
