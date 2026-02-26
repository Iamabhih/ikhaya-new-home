
# Fix Campaign Discount Prices Not Carrying Through

## The Problem

There are **three breaks** in how campaign prices flow through the system:

1. **Product Detail Page**: When a user clicks a campaign product card, it navigates to `/products/{slug}`. The `ProductDetailPage` fetches the product directly from the `products` table, which only has the original price. There is no awareness of campaign pricing at all.

2. **Cart Storage**: The `cart_items` database table has no column for storing a price override. When `CampaignProductCard` calls `addToCart(product.id, 1, { ...product, price: effectivePrice })`, the `effectivePrice` is only used for analytics tracking -- the actual cart item just stores `product_id` and `quantity`. When cart items are fetched, the price comes from joining with the `products` table (always the original price).

3. **Checkout/Order Summary**: Both the `CartPage` and `OrderSummary` calculate totals using `item.product.price` from the products table join, so campaign discounts are lost. The `process-order` edge function also reads `item.product?.price` -- original price again.

## Solution

### Step 1: Add `override_price` column to `cart_items` table

Add a nullable `override_price` (numeric) column to `cart_items`. When null, the product's regular price applies. When set, it represents a campaign or promotional price override.

### Step 2: Store campaign price when adding to cart

Update `useCart.ts` so the `addToCart` mutation accepts an optional `overridePrice` parameter. When provided, it gets saved to the new `override_price` column in `cart_items`. Also update the cart query to select this column.

Update `useEnhancedCart.ts` so `enhancedAddToCart` passes the override price from `productData` through to `useCart.addToCart`.

### Step 3: Use override price in cart totals and display

- **`useCart.ts`**: Change the total calculation to use `item.override_price ?? item.product.price`
- **`CartPage.tsx`**: Display the override price when present (show campaign price with original crossed out)
- **`OrderSummary.tsx`**: Same -- use override price for line item calculations

### Step 4: Pass campaign price to product detail page

Add URL query parameter support: when navigating from a campaign card, link to `/products/{slug}?campaign={campaignId}`. On the `ProductDetailPage`, if a `campaign` query param is present, fetch the campaign product data and display the campaign price instead of the regular price. The "Add to Cart" button on the detail page will also pass the override price.

### Step 5: Update process-order edge function

Change `unit_price` and `total_price` in the order items mapping to prefer `override_price` over `product.price`, so the correct discounted price is recorded in the order.

### Step 6: Update CHANGELOG

Document the campaign pricing fix.

## Files to Modify

| File | Change |
|---|---|
| Database migration | Add `override_price` column to `cart_items` |
| `src/hooks/useCart.ts` | Accept and store `overridePrice`, select it in query, use in totals |
| `src/hooks/useEnhancedCart.ts` | Pass `productData.price` as `overridePrice` when provided |
| `src/components/campaigns/CampaignProductCard.tsx` | Add `campaign` query param to product link |
| `src/pages/ProductDetailPage.tsx` | Read `campaign` query param, fetch campaign price, pass to ProductInfo |
| `src/components/products/ProductInfo.tsx` | Accept optional `campaignPrice` prop, display it, pass to addToCart |
| `src/pages/CartPage.tsx` | Display override price with original crossed out |
| `src/components/checkout/OrderSummary.tsx` | Use override price for line item totals |
| `supabase/functions/process-order/index.ts` | Prefer `override_price` for unit/total price |
| `CHANGELOG.md` | Document the fix |

## What Will NOT Change

- Campaign management admin UI -- untouched
- Product catalog, categories, search -- untouched
- Payment processing, webhooks -- untouched
- All other cart functionality (wishlist, analytics, abandonment tracking) -- untouched
