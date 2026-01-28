

# Fix Order Processing Flow - Complete Repair Plan

## Problem Summary

Orders are being lost because the PayFast webhook is crashing before it can process payments. The root cause is that even though signatures aren't being used for form submission, the webhook code **still attempts** to generate a signature for verification when PayFast sends one in the webhook - and this crashes because `crypto.subtle.digest('MD5')` is not supported in Deno Edge Functions.

**Evidence from database:**
- 10 pending orders never converted to orders
- Payment logs show repeated `"Unrecognized algorithm name"` errors
- Every webhook call fails at line 117 (generateSignature)
- Only 2 orders exist vs many pending orders

---

## Root Cause Analysis

### Issue #1: MD5 Algorithm Not Supported (CRITICAL - BLOCKING ALL ORDERS)

**File:** `supabase/functions/payfast-webhook/index.ts`

**Problem:** Line 36 uses `crypto.subtle.digest('MD5', data_bytes)` but Web Crypto API in Deno does NOT support MD5.

**Current behavior:**
1. PayFast sends webhook with signature field
2. Code sees signature exists and calls `generateSignature()` 
3. `crypto.subtle.digest('MD5', ...)` throws "Unrecognized algorithm name"
4. Entire webhook fails
5. Order never gets created

**Fix:** Since you use simple HTML form submission without signature verification, completely remove the signature verification code. The webhook should simply:
1. Log the incoming data
2. Check payment_status === 'COMPLETE'
3. Call process-order function

### Issue #2: Missing Required Fields in process-order

**File:** `supabase/functions/process-order/index.ts`

**Problem:** The `create_order_transaction` function requires these fields:
- `subtotal` (required - NOT NULL in database)
- `billing_address` (required - NOT NULL in database)
- `shipping_amount` (has default but should be passed)

Current code passes:
- `total_amount` ✓
- `shipping_address` ✓ (but NOT billing_address)
- Missing `subtotal`
- Missing `billing_address`

**Fix:** Update the data mapping to include all required fields:

```typescript
p_order_data: {
  email: pendingOrder.form_data.email,
  subtotal: pendingOrder.cart_data.total,  // ADD THIS
  shipping_amount: pendingOrder.delivery_data.fee || 0,  // ADD THIS
  total_amount: pendingOrder.total_amount,
  billing_address: {  // ADD THIS (same as shipping for now)
    firstName: pendingOrder.form_data.firstName,
    lastName: pendingOrder.form_data.lastName,
    // ... same fields as shipping_address
  },
  shipping_address: { ... },
  // rest of fields
}
```

### Issue #3: Order Items Missing product_name and product_sku

**File:** `supabase/functions/process-order/index.ts`

The order items mapping doesn't include `product_name` and `product_sku` fields that the database function expects:

Current:
```typescript
p_order_items: items.map(item => ({
  product_id: item.product.id,
  quantity: item.quantity,
  unit_price: item.product.price,
  total_price: item.product.price * item.quantity,
  product_snapshot: {...}
}))
```

Fix - add missing fields:
```typescript
p_order_items: items.map(item => ({
  product_id: item.product.id,
  product_name: item.product.name,    // ADD
  product_sku: item.product.sku,      // ADD
  quantity: item.quantity,
  unit_price: item.product.price,
  // ...
}))
```

---

## Implementation Plan

### Step 1: Fix PayFast Webhook (CRITICAL)

**File:** `supabase/functions/payfast-webhook/index.ts`

Remove the entire signature verification logic since you're using simple HTML form submission:

1. Delete `generateSignature` function (lines 9-42)
2. Remove signature verification block (lines 110-143)
3. Keep only the essential flow:
   - Parse form data
   - Log webhook received
   - If payment_status === 'COMPLETE', call process-order
   - Return OK

Simplified webhook flow:
```text
Receive webhook
  ↓
Log to payment_logs (webhook_received)
  ↓
Check payment_status === 'COMPLETE'
  ↓
Call process-order with orderNumber + paymentData
  ↓
Log result (processing_completed or processing_failed)
  ↓
Return 200 OK
```

### Step 2: Fix process-order Data Mapping

**File:** `supabase/functions/process-order/index.ts`

Update the `create_order_transaction` call (lines 110-149) to include:

1. Add `subtotal` from `pendingOrder.cart_data.total`
2. Add `billing_address` (using same data as shipping_address)
3. Add `shipping_amount` from `pendingOrder.delivery_data.fee`
4. Add `product_name` and `product_sku` to order items

### Step 3: Deploy and Verify

After fixes are deployed:
1. Test with a small order
2. Check edge function logs for errors
3. Verify order appears in database
4. Confirm order shows on /orders page

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/payfast-webhook/index.ts` | Remove signature verification entirely, keep only essential webhook processing |
| `supabase/functions/process-order/index.ts` | Fix data mapping: add subtotal, billing_address, shipping_amount, product_name, product_sku |

### No Database Changes Required

The database function `create_order_transaction` is working correctly. The issue is entirely in the edge functions not passing the correct data.

---

## Testing Plan

After deployment:

1. **Immediate verification:**
   - Check edge function logs for any errors
   - Verify webhook receives PayFast callbacks

2. **Order flow test:**
   - Place a test order
   - Complete payment on PayFast
   - Verify order appears in admin dashboard
   - Verify order appears on customer's /orders page

3. **Recovery of lost orders:**
   - The most recent pending order `IKH-1769430403649-58C64943` can be manually processed
   - Call process-order edge function with the order number to create the order

---

## Expected Outcome

After implementing these fixes:
- All PayFast webhooks will process successfully (no more MD5 errors)
- Orders will be created with all required fields
- Customers will see their orders on the /orders page
- No more lost revenue from failed order processing

