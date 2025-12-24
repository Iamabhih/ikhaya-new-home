# Implementation Guide: Order Creation Transaction Wrapper

**Issue:** CRITICAL #4 - No transaction wrapping for order creation
**Priority:** 🔴 CRITICAL - Fix immediately
**Estimated Time:** 2-3 hours

---

## Problem Statement

Currently, order creation in `/supabase/functions/process-order/index.ts` involves multiple database operations without transaction wrapping:

1. Insert into `orders`
2. Insert into `order_items` (multiple rows)
3. Update `product stock` (multiple products)
4. Send confirmation email
5. Delete from `pending_orders`
6. Insert into `analytics_events`

**Risk:** If ANY step fails after step 1, the database is left in an inconsistent state:
- Order exists but no order items
- Payment received but inventory not updated
- Pending order not cleaned up

---

## Solution Overview

Create a PostgreSQL function that wraps all order creation logic in a single atomic transaction. If any step fails, ALL changes are rolled back automatically.

---

## Implementation Steps

### Step 1: Apply Database Migration

The migration file has been created: `supabase/migrations/20251224120001_create_order_transaction.sql`

**Apply it:**
```bash
cd /path/to/ikhaya-new-home

# Test migration locally first
supabase db reset --local

# If successful, apply to production
supabase db push
```

**Verify:**
```sql
-- Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'create_order_transaction';

-- Test function (dry run with fake data)
SELECT create_order_transaction(
  'TEST-123',
  NULL,
  '{"email": "test@example.com", "total_amount": "100.00"}'::jsonb,
  ARRAY[]::jsonb[],
  gen_random_uuid()
);
```

---

### Step 2: Update Edge Function

**File:** `/supabase/functions/process-order/index.ts`

**Current Code (Lines 108-280):**
```typescript
// Create the main order
const { data: newOrder, error: orderError } = await supabase
  .from('orders')
  .insert({...})
  .select()
  .single();

// Create order items
const { error: itemsError } = await supabase
  .from('order_items')
  .insert(orderItems);

// Update stock...
// Send email...
// etc.
```

**New Code:**
```typescript
// Use transaction function instead
const { data: result, error: transactionError } = await supabase.rpc(
  'create_order_transaction',
  {
    p_order_number: orderNumber,
    p_user_id: pendingOrder.user_id,
    p_order_data: {
      email: pendingOrder.form_data.email,
      total_amount: pendingOrder.total_amount,
      shipping_address: {
        firstName: pendingOrder.form_data.firstName,
        lastName: pendingOrder.form_data.lastName,
        email: pendingOrder.form_data.email,
        phone: pendingOrder.form_data.phone,
        address: pendingOrder.form_data.address,
        city: pendingOrder.form_data.city,
        postalCode: pendingOrder.form_data.postalCode,
        province: pendingOrder.form_data.province,
      },
      delivery_info: {
        fee: pendingOrder.delivery_data.fee,
        method: pendingOrder.delivery_data.method
      },
      payment_method: 'payfast',
      payment_data: paymentData || {},
      notes: `Order processed via ${source}`
    },
    p_order_items: pendingOrder.cart_data.items.map((item: any) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
      product_snapshot: {
        name: item.product.name,
        description: item.product.description,
        images: item.product.images
      }
    })),
    p_pending_order_id: pendingOrder.id
  }
);

if (transactionError) {
  console.error('Transaction failed:', transactionError);
  await logPaymentEvent(
    'order_failed',
    { orderNumber },
    'Order creation transaction failed',
    transactionError
  );

  return new Response(
    JSON.stringify({
      error: 'Failed to create order',
      details: transactionError.message
    }),
    { status: 500, headers: corsHeaders }
  );
}

// Parse result
const orderResult = typeof result === 'string' ? JSON.parse(result) : result;

if (!orderResult.success) {
  console.error('Order creation failed:', orderResult.error);
  await logPaymentEvent(
    'order_failed',
    { orderNumber },
    orderResult.error,
    orderResult.error_detail
  );

  return new Response(
    JSON.stringify({
      error: 'Failed to create order',
      details: orderResult.error
    }),
    { status: 500, headers: corsHeaders }
  );
}

console.log('Order created successfully:', orderResult.order_id);
await logPaymentEvent('order_created', {
  orderId: orderResult.order_id,
  orderNumber: orderResult.order_number
});

// AFTER transaction succeeds, send email (non-critical)
try {
  const { error: emailError } = await supabase.functions.invoke('send-order-confirmation', {
    body: {
      orderNumber: orderResult.order_number,
      customerEmail: pendingOrder.form_data.email,
      orderId: orderResult.order_id
    }
  });

  if (emailError) {
    console.error('Email send failed (non-critical):', emailError);
    // Don't fail the order if email fails
  }
} catch (emailError) {
  console.error('Email service error (non-critical):', emailError);
}

return new Response(
  JSON.stringify({
    success: true,
    orderId: orderResult.order_id,
    orderNumber: orderResult.order_number,
    message: 'Order processed successfully'
  }),
  { status: 200, headers: corsHeaders }
);
```

---

### Step 3: Deploy Edge Function

```bash
# Deploy updated edge function
supabase functions deploy process-order

# Verify deployment
supabase functions list
```

---

### Step 4: Test End-to-End

**Test Scenario 1: Successful Order**
1. Add items to cart
2. Proceed to checkout
3. Complete PayFast payment (use sandbox)
4. Verify webhook triggers
5. Check order created with all items
6. Verify stock updated
7. Verify pending order deleted

**Test Scenario 2: Insufficient Stock**
1. Manually set product stock to 0
2. Try to order that product
3. Verify order creation fails
4. Verify NO order record created
5. Verify pending order still exists
6. Verify payment_logs shows error

**Test Scenario 3: Database Error**
1. Temporarily revoke permissions on order_items table
2. Try to create order
3. Verify transaction rolls back
4. Verify NO order or order_items created

---

## Benefits

✅ **Atomic Operations:** All-or-nothing guarantee
✅ **Stock Validation:** Check stock BEFORE order creation
✅ **Race Condition Protection:** Row-level locks prevent overselling
✅ **Automatic Rollback:** Database handles cleanup on error
✅ **Better Error Messages:** Clear error details returned
✅ **Performance:** Single database round-trip

---

## Rollback Plan

If issues occur:

```bash
# Revert edge function
git revert <commit-hash>
supabase functions deploy process-order

# Revert migration
supabase migration down 20251224120001

# Or manually drop function
psql $DATABASE_URL -c "DROP FUNCTION IF EXISTS create_order_transaction CASCADE;"
```

---

## Monitoring

**Watch for these errors:**
- `payment_logs` with event_type = 'order_failed'
- Edge function logs: `supabase functions logs process-order`
- Database logs: Check for RAISE EXCEPTION messages

**Success Metrics:**
- Order creation success rate should be >99%
- Stock mismatches should be 0
- Orphaned pending orders should be 0

---

## Next Steps

After implementing:
1. [ ] Monitor for 24-48 hours
2. [ ] Check payment_logs for failures
3. [ ] Verify stock accuracy
4. [ ] Implement alert for failed orders
5. [ ] Document in team wiki

---

**Created:** 2025-12-24
**Updated:** 2025-12-24
**Status:** Ready for implementation
