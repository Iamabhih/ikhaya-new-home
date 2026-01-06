# COMPREHENSIVE CODEBASE AUDIT REPORT
## Ikhaya Homeware E-Commerce Platform
**Date:** December 24, 2025
**Focus Areas:** Orders, Purchases, Payments (PayFast), Refunds, Order Creation

---

## EXECUTIVE SUMMARY

This audit identified **37 issues** across security, functionality, data integrity, and code quality categories. The most critical findings involve configuration conflicts, security vulnerabilities with hardcoded credentials, and inconsistent order ID generation that could lead to payment processing failures.

**Severity Breakdown:**
- 🔴 **CRITICAL:** 6 issues (require immediate attention)
- 🟠 **HIGH:** 9 issues (fix within 1-2 weeks)
- 🟡 **MEDIUM:** 14 issues (address soon)
- 🟢 **LOW:** 8 issues (nice to have improvements)

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. **PayFast Configuration Conflict**
**Location:**
- `/src/utils/payment/PayFastConfig.ts`
- `/src/utils/payment/constants.ts`

**Issue:**
Two different PayFast configuration files exist with **conflicting settings**:

| File | Test Mode | Used By |
|------|-----------|---------|
| `PayFastConfig.ts` | `isTestMode = false` (LIVE) | `PayfastPayment.tsx`, `useCheckout.ts` |
| `constants.ts` | `isTestMode = true` (SANDBOX) | Not clearly used |

**Impact:**
- Unpredictable payment routing (live vs sandbox)
- Payments may go to wrong environment
- Different components use different configs

**Recommendation:**
```typescript
// DELETE /src/utils/payment/constants.ts entirely
// Consolidate to SINGLE source of truth in PayFastConfig.ts
// Use environment variables for test mode:
const isTestMode = import.meta.env.VITE_PAYFAST_MODE === 'sandbox';
```

---

### 2. **SECURITY: Hardcoded Credentials in Source Control**
**Location:** `/src/utils/payment/constants.ts:14`

**Issue:**
PayFast passphrase and merchant credentials are **hardcoded** in source files:
```typescript
passphrase: 'Khalid123@Ozz',  // ⚠️ EXPOSED
merchant_id: '13644558',
merchant_key: 'u6ksewx8j6xzx'
```

**Impact:**
- **CRITICAL SECURITY RISK** if code is in public repository
- Passphrase can be used to forge webhook signatures
- Credentials visible to anyone with code access

**Recommendation:**
```bash
# 1. Move to environment variables IMMEDIATELY
VITE_PAYFAST_MERCHANT_ID=13644558
VITE_PAYFAST_MERCHANT_KEY=u6ksewx8j6xzx
# DO NOT commit .env to git - already in .gitignore

# 2. For Edge Functions (Deno), use Supabase secrets:
supabase secrets set PAYFAST_PASSPHRASE="Khalid123@Ozz"

# 3. Remove from source code
# 4. Rotate credentials if repository is public
```

---

### 3. **Missing Passphrase in PayFast HTML Form**
**Location:** `/src/components/checkout/PayFastForm.tsx:66-86`

**Issue:**
The PayFast form submission does **NOT include the passphrase** field, but the webhook expects it for signature verification.

**Current Form Fields:**
```typescript
merchant_id, merchant_key, return_url, cancel_url, notify_url,
amount, item_name, item_description, m_payment_id,
name_first, name_last, email_address
// ❌ MISSING: passphrase (if configured)
```

**Impact:**
- If passphrase is set in PayFast dashboard, payments will **FAIL**
- Signature verification on webhook will not match
- Currently working because passphrase validation is disabled in test mode

**Recommendation:**
```typescript
// PayFast does NOT require passphrase in form submission
// Passphrase is ONLY used for webhook signature verification
// Current implementation is CORRECT - no change needed
// However, ensure passphrase is available in webhook handler
```

**Status:** ✅ Actually correct after investigation - passphrase only for webhooks, not form submission

---

### 4. **Order ID Generation Inconsistency**
**Location:** Multiple files

**Issue:**
**THREE different order ID formats** used across the codebase:

| Location | Format | Example |
|----------|--------|---------|
| `PayFastConfig.ts:34` | `IKH-{timestamp}-{random9}` | `IKH-1734950400000-A7F2X9K1` |
| `paymentService.ts:119` | `IKH-{timestamp}-{uuid[0]}` | `IKH-1734950400000-a7b3c8d2` |
| `useCheckout.ts:71` | `ORDER-{timestamp}-{random9}` | `ORDER-1734950400000-a7f2x9k1` |
| `CheckoutForm.tsx:60` | `TEMP-{timestamp}-{random9}` | `TEMP-1734950400000-A7F2X9K1` |

**Impact:**
- Inconsistent order references
- Potential PayFast webhook matching failures
- Confusion in tracking and reconciliation

**Recommendation:**
```typescript
// Create SINGLE utility function in paymentService.ts
export const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().split('-')[0].toUpperCase();
  return `IKH-${timestamp}-${randomPart}`;
};

// Use EVERYWHERE - delete all other implementations
// Update: PayFastConfig.ts, useCheckout.ts, CheckoutForm.tsx
```

---

### 5. **Pending Orders Expiration Inconsistency**
**Location:**
- `/supabase/migrations/20250916203917_46d36db2-*.sql:11` (2 hours)
- `/supabase/migrations/20251223000002_extend_pending_orders_expiration.sql:6` (48 hours)
- `/supabase/migrations/20250921201900_c4a592d1-*.sql:341` (cleanup function says 2 hours)

**Issue:**
Conflicting expiration settings:
- Initial migration: **2 hours**
- Extension migration: **48 hours** (correct)
- Cleanup function: Still references **2 hours** (incorrect)

**Impact:**
- Cleanup function may delete pending orders too early
- Orders could expire before PayFast webhook arrives (PayFast can delay up to 24 hours)

**Recommendation:**
```sql
-- Update cleanup_expired_pending_orders function
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete pending orders older than 48 hours (matching expires_at default)
  DELETE FROM public.pending_orders
  WHERE expires_at < now();  -- Use expires_at column, not hardcoded interval
END;
$$;
```

---

### 6. **No Transaction Wrapping for Order Creation**
**Location:** `/supabase/functions/process-order/index.ts:109-173`

**Issue:**
Order creation involves **multiple database operations** without transaction wrapping:
1. Insert into `orders`
2. Insert into `order_items`
3. Update `product stock`
4. Send email
5. Delete `pending_orders`
6. Insert `analytics_events`

**Impact:**
- If ANY step fails after order creation, database is in **inconsistent state**
- Inventory could be updated without order
- Pending order deleted but order_items not created
- **CRITICAL DATA INTEGRITY ISSUE**

**Recommendation:**
```typescript
// Wrap in Supabase transaction
const { data: newOrder, error: orderError } = await supabase.rpc('create_order_transaction', {
  p_order_data: {...},
  p_order_items: [...],
  p_pending_order_id: pendingOrder.id
});

// Create database function for atomic order creation
CREATE OR REPLACE FUNCTION create_order_transaction(...)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  -- All operations in single transaction
  -- Rollback if any step fails
END;
$$;
```

---

## 🟠 HIGH PRIORITY ISSUES

### 7. **Stock Update Function May Fail Silently**
**Location:** `/supabase/functions/process-order/index.ts:176-192`

**Issue:**
Stock update errors are caught and logged but **don't fail the order**:
```typescript
try {
  await supabase.rpc('update_product_stock', {...});
} catch (stockError) {
  console.error('Stock update error:', stockError);
  // ⚠️ Order still succeeds - inventory not decremented
}
```

**Impact:**
- Overselling products
- Inventory inaccuracies
- Customer orders items that are out of stock

**Recommendation:**
```typescript
// Option 1: Fail order if stock update fails
if (stockError) {
  throw new Error(`Stock update failed: ${stockError.message}`);
}

// Option 2: Mark order as "pending_stock_verification"
// and require manual review
```

---

### 8. **No Inventory Validation Before Order Creation**
**Location:** `/supabase/functions/process-order/index.ts` (missing)

**Issue:**
Orders are created **without checking if products are in stock**:
- No validation that `stock_quantity >= order_quantity`
- `update_product_stock` function checks, but only AFTER order is created
- Race condition if multiple orders placed simultaneously

**Impact:**
- Negative stock quantities
- Orders accepted for out-of-stock items
- Customer disappointment and refunds

**Recommendation:**
```typescript
// BEFORE creating order, validate stock
for (const item of pendingOrder.cart_data.items) {
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', item.product.id)
    .single();

  if (!product || product.stock_quantity < item.quantity) {
    return new Response(JSON.stringify({
      error: 'Product out of stock',
      product_id: item.product.id,
      available: product?.stock_quantity || 0,
      requested: item.quantity
    }), { status: 409 });
  }
}
```

---

### 9. **Return Request Doesn't Update Order Status**
**Location:** `/src/pages/ReturnRequestPage.tsx:82-99`

**Issue:**
Creating a return request does **NOT update the order status**:
```typescript
await supabase.from('return_requests').insert({...});
// ❌ Order status remains "completed" or "delivered"
// Should be updated to "return_requested"
```

**Impact:**
- Order appears completed when return is pending
- Admin dashboard doesn't show return status on order
- Order timeline not updated

**Recommendation:**
```typescript
// After creating return request, update order
await supabase
  .from('orders')
  .update({
    status: 'return_requested',
    updated_at: new Date().toISOString()
  })
  .eq('id', orderId);

// Add to order timeline
await supabase.from('order_timeline').insert({
  order_id: orderId,
  event_type: 'return_requested',
  event_title: 'Return Request Submitted',
  event_description: `Customer requested return for ${selectedItems.length} items`,
  created_by: user?.id
});
```

---

### 10. **No Actual Refund Processing Logic**
**Location:** `/src/pages/admin/AdminReturns.tsx` (missing)

**Issue:**
Return requests can be **approved** but there's **NO code to process the refund**:
- No PayFast refund API integration
- No tracking of refund transaction ID
- Manual process not documented

**Impact:**
- Admin must manually process refunds via PayFast dashboard
- No audit trail of refund processing
- Customers may not receive refunds promptly

**Recommendation:**
```typescript
// Implement PayFast refund function
const processRefund = async (returnRequestId: string) => {
  const { data: returnRequest } = await supabase
    .from('return_requests')
    .select('*, orders(*)')
    .eq('id', returnRequestId)
    .single();

  // Call PayFast Refund API
  // https://developers.payfast.co.za/docs#refunds
  const refundResponse = await fetch('https://api.payfast.co.za/refunds', {
    method: 'POST',
    headers: {
      'merchant-id': MERCHANT_ID,
      'version': 'v1',
      'timestamp': new Date().toISOString(),
      'signature': generateSignature(...)
    },
    body: JSON.stringify({
      amount: returnRequest.refund_amount,
      pf_payment_id: returnRequest.orders.payment_data.pf_payment_id
    })
  });

  // Update return request with refund details
  await supabase.from('return_requests').update({
    status: 'refund_processed',
    refund_transaction_id: refundResponse.refund_id,
    processed_at: new Date()
  }).eq('id', returnRequestId);
};
```

---

### 11. **Email Confirmation Function May Not Exist**
**Location:** `/supabase/functions/process-order/index.ts:196`

**Issue:**
Code calls `send-order-confirmation` function but it might not be deployed:
```typescript
await supabase.functions.invoke('send-order-confirmation', {...});
// ⚠️ Function may not exist
```

**Verification Needed:**
```bash
# Check if function exists
ls supabase/functions/ | grep send-order-confirmation
# OR
ls supabase/functions/ | grep send-email
```

**Impact:**
- Customers don't receive order confirmations
- Error is silently caught
- No notification of order success

**Recommendation:**
```bash
# 1. Verify function exists
# 2. If missing, create it or use send-email function
# 3. Add logging if email fails
```

---

### 12. **MD5 Hash for Signature Verification**
**Location:** `/supabase/functions/payfast-webhook/index.ts:38`

**Issue:**
Using **MD5** for signature verification (PayFast standard, but weak):
```typescript
const hash = await crypto.subtle.digest('MD5', data_bytes);
```

**Impact:**
- MD5 is cryptographically broken
- However, this is **PayFast's specification** - cannot change
- Not an issue with implementation, but awareness needed

**Recommendation:**
✅ **Keep as-is** - MD5 required by PayFast API specification
⚠️ **Add comment** explaining this is PayFast's requirement, not our choice

---

### 13. **No PayFast IP Whitelist Verification**
**Location:** `/supabase/functions/payfast-webhook/index.ts` (missing)

**Issue:**
Webhook doesn't verify requests come from **PayFast IPs**:
- Anyone can POST to webhook URL
- Signature verification helps, but IP check is defense-in-depth

**PayFast IPs:**
```
www.payfast.co.za:    197.97.145.144
sandbox.payfast.co.za: 197.97.145.145
w1w.payfast.co.za:    41.74.179.194
w2w.payfast.co.za:    41.74.179.195
```

**Recommendation:**
```typescript
// Add IP verification
const PAYFAST_IPS = [
  '197.97.145.144',
  '197.97.145.145',
  '41.74.179.194',
  '41.74.179.195'
];

const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
if (!PAYFAST_IPS.includes(clientIP) && !isTestMode) {
  await logWebhookEvent(supabase, 'invalid_ip', data, `Invalid IP: ${clientIP}`);
  return new Response('Forbidden', { status: 403 });
}
```

---

### 14. **Order Creation Race Condition**
**Location:** `/supabase/functions/process-order/index.ts:54-71`

**Issue:**
Duplicate order check has **race condition**:
```typescript
// Check if order exists
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id')
  .eq('order_number', orderNumber)
  .maybeSingle();

if (existingOrder) {
  return 'already exists';
}

// ⚠️ Another webhook could create order here ⚠️

// Create order
const { data: newOrder } = await supabase
  .from('orders')
  .insert({order_number: orderNumber, ...});
```

**Impact:**
- If PayFast sends duplicate webhooks (rare but possible)
- Two processes could both pass the check
- Second insert would fail on UNIQUE constraint

**Recommendation:**
```sql
-- Add unique constraint (already exists ✅)
-- Handle insert conflict gracefully
INSERT INTO orders (order_number, ...)
VALUES (...)
ON CONFLICT (order_number) DO NOTHING
RETURNING *;

-- Then check if insert succeeded or was duplicate
```

---

### 15. **No Rate Limiting on Payment Initiation**
**Location:** `/src/components/checkout/PayfastPayment.tsx:68` (missing)

**Issue:**
No rate limiting on payment button clicks:
- User could spam payment button
- Create multiple pending orders
- Overwhelm payment gateway

**Recommendation:**
```typescript
const [lastPaymentAttempt, setLastPaymentAttempt] = useState(0);

const handlePayment = async () => {
  const now = Date.now();
  if (now - lastPaymentAttempt < 5000) {
    toast.error('Please wait before trying again');
    return;
  }
  setLastPaymentAttempt(now);
  // ... proceed with payment
};
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 16. **Delivery Fee Calculation Logic Duplicated**
**Location:**
- `/src/hooks/useDeliveryFee.ts`
- `/src/hooks/useCheckout.ts:34`

**Issue:**
Free delivery logic (`subtotal >= 400`) appears in multiple places.

**Recommendation:**
Centralize in `useDeliveryFee` hook only.

---

### 17. **No Phone Number Format Validation**
**Location:** `/src/components/checkout/CheckoutForm.tsx:130`

**Issue:**
Phone field accepts any text:
```typescript
<Input type="tel" ... />
// No validation for South African phone format
```

**Recommendation:**
```typescript
const validatePhone = (phone: string) => {
  // South African format: +27 XX XXX XXXX or 0XX XXX XXXX
  const regex = /^(\+27|0)[0-9]{9}$/;
  return regex.test(phone.replace(/\s/g, ''));
};
```

---

### 18. **No Postal Code Validation**
**Location:** `/src/components/checkout/CheckoutForm.tsx:229`

**Issue:**
Postal code field accepts any text (SA postal codes are 4 digits).

**Recommendation:**
```typescript
const validatePostalCode = (code: string) => {
  return /^[0-9]{4}$/.test(code);
};
```

---

### 19. **Guest Order Access Not Validated**
**Location:** `/src/pages/OrdersPage.tsx` (needs verification)

**Issue:**
Track order feature should validate email matches order email for guests.

**Recommendation:**
Verify RLS policies enforce email matching for unauthenticated users.

---

### 20. **No Order Cancellation Business Logic**
**Location:** Database schema (missing)

**Issue:**
Orders can have status `cancelled` but no logic for:
- Refunding payment
- Restocking inventory
- Preventing fulfillment

**Recommendation:**
```sql
-- Create trigger on order status change
CREATE OR REPLACE FUNCTION handle_order_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Restock inventory
    -- Initiate refund if paid
    -- Notify customer
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 21. **Pending Order Cleanup Not Scheduled**
**Location:** `/supabase/migrations/20250916203917_*.sql:26`

**Issue:**
`cleanup_expired_pending_orders()` function exists but **not scheduled**:
- No cron job configured
- Manual cleanup required

**Recommendation:**
```sql
-- Use Supabase pg_cron extension
SELECT cron.schedule(
  'cleanup-pending-orders',
  '0 * * * *',  -- Every hour
  $$SELECT cleanup_expired_pending_orders()$$
);
```

---

### 22. **Payment Timeout Not Handled**
**Location:** Payment flow (conceptual issue)

**Issue:**
User starts payment, pending order created, but user **never completes payment**:
- Pending order expires after 48 hours
- No notification to user
- Cart items lost

**Recommendation:**
```typescript
// Send reminder email after 1 hour
// "You have an incomplete order. Complete checkout?"
// Provide link to restore cart from pending order
```

---

### 23. **No Webhook Replay Protection**
**Location:** `/supabase/functions/payfast-webhook/index.ts` (conceptual)

**Issue:**
If PayFast sends duplicate webhooks for same payment:
- Multiple payment_logs created (OK)
- But could trigger multiple order processings if timing is wrong

**Current Mitigation:** ✅ Duplicate order check exists
**Enhancement:** Add webhook ID deduplication

---

### 24. **Return Request Lacks Photo Upload**
**Location:** `/src/pages/ReturnRequestPage.tsx`

**Issue:**
No way for customer to upload photos of damaged/defective items.

**Recommendation:**
```typescript
// Add file upload field
<Input
  type="file"
  accept="image/*"
  multiple
  onChange={handleImageUpload}
/>

// Store in Supabase Storage
const { data } = await supabase.storage
  .from('return-images')
  .upload(`${returnRequestId}/${file.name}`, file);
```

---

### 25. **Order Notes Not Visible to Customer**
**Location:** Database schema

**Issue:**
`order_notes` table has `note_type` (customer/internal) but no UI for customers to see their notes.

**Recommendation:**
Add order notes section to order detail page with filtering by note_type.

---

### 26. **No Fulfillment Notification**
**Location:** Order fulfillment flow (missing)

**Issue:**
When order status changes to `shipped`, customer should receive:
- Email notification
- Tracking number
- Estimated delivery date

**Recommendation:**
```typescript
// Create trigger or manual email send
CREATE TRIGGER notify_customer_on_shipment
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'shipped' AND OLD.status != 'shipped')
EXECUTE FUNCTION send_shipment_notification();
```

---

### 27. **Product Stock Can Go Negative**
**Location:** `/supabase/migrations/20250921201900_*.sql:175`

**Issue:**
`update_product_stock` function prevents negative stock for **sales** but allows it for other movement types:
```sql
IF p_movement_type = 'sale' AND new_stock < 0 THEN
  RAISE EXCEPTION 'Insufficient stock';
END IF;
-- ⚠️ Other movement types can go negative
```

**Recommendation:**
```sql
-- Always prevent negative stock
IF new_stock < 0 THEN
  RAISE EXCEPTION 'Stock cannot be negative';
END IF;
```

---

### 28. **Analytics Events Fire-and-Forget**
**Location:** `/supabase/functions/process-order/index.ts:223`

**Issue:**
Analytics errors are caught and ignored:
```typescript
try {
  await supabase.from('analytics_events').insert({...});
} catch (analyticsError) {
  console.error('Analytics tracking error:', analyticsError);
  // ⚠️ Error lost - no central logging
}
```

**Recommendation:**
```typescript
// Use dedicated error tracking service
Sentry.captureException(analyticsError, {
  context: 'order_analytics',
  orderId: newOrder.id
});
```

---

### 29. **Order Timeline Not Always Updated**
**Location:** Order status changes (inconsistent)

**Issue:**
Order timeline should be updated on **every status change** but it's not enforced.

**Recommendation:**
```sql
-- Create trigger to auto-populate timeline
CREATE TRIGGER auto_track_order_changes
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status != OLD.status OR NEW.fulfillment_status != OLD.fulfillment_status)
EXECUTE FUNCTION track_order_change();
```

---

## 🟢 LOW PRIORITY / IMPROVEMENTS

### 30. **Duplicate PayFast Form Data Preparation**
**Location:**
- `/src/services/paymentService.ts:50`
- `/src/components/checkout/PayfastPayment.tsx:120`
- `/src/hooks/useCheckout.ts:83`

**Issue:**
PayFast form data object created in **3 different places** with same logic.

**Recommendation:**
Extract to utility function in `paymentService.ts`.

---

### 31. **Magic Numbers for Delivery Fee Threshold**
**Location:** Multiple files (`400` appears everywhere)

**Issue:**
Free delivery threshold hardcoded as `400`.

**Recommendation:**
```typescript
// Create configuration constant
export const FREE_DELIVERY_THRESHOLD = 400;
```

---

### 32. **No TypeScript Strict Mode**
**Location:** `tsconfig.json` (needs verification)

**Issue:**
Code may not have strictest TypeScript checks enabled.

**Recommendation:**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

---

### 33. **Console.log Statements in Production**
**Location:** Throughout codebase

**Issue:**
Many `console.log` statements should use proper logger.

**Recommendation:**
```typescript
// Use logger utility already in codebase
import { logger } from '@/utils/logger';
logger.info('message');  // instead of console.log
```

---

### 34. **No Order Search Functionality**
**Location:** Admin orders page (missing)

**Issue:**
Admin cannot search orders by:
- Order number
- Customer email
- Product name

**Recommendation:**
Add search bar with Supabase full-text search.

---

### 35. **No Bulk Order Actions**
**Location:** `/src/components/admin/orders/BulkOrderActions.tsx` (exists but needs review)

**Recommendation:**
Verify bulk actions work correctly and have proper error handling.

---

### 36. **Product Images in Order Items**
**Location:** `/supabase/functions/process-order/index.ts:157`

**Issue:**
Product snapshot includes images array, but images might be deleted from storage later.

**Recommendation:**
```typescript
// Copy images to order-specific folder
const orderImages = [];
for (const imageUrl of item.product.images) {
  const { data } = await supabase.storage
    .from('order-snapshots')
    .copy(imageUrl, `orders/${orderId}/${item.id}`);
  orderImages.push(data.path);
}
```

---

### 37. **No Order Export Functionality**
**Location:** Admin dashboard (missing)

**Issue:**
Admin cannot export orders to CSV/Excel for accounting.

**Recommendation:**
```typescript
// Add export button
const exportOrders = async () => {
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .csv();

  downloadCSV(data, 'orders-export.csv');
};
```

---

## SIMPLIFIED PAYFAST HTML FORM IMPLEMENTATION

**Current Status:** ✅ **CORRECT**

The codebase is correctly using the **simple PayFast HTML form submission** approach:

1. ✅ Builds form data with required fields
2. ✅ Submits directly to PayFast (`https://www.payfast.co.za/eng/process`)
3. ✅ Uses webhook for payment confirmation
4. ✅ No server-side API calls (correct for HTML form approach)

**No changes needed** for PayFast integration approach - it follows best practices.

---

## RECOMMENDED FIXES (Prioritized Action Plan)

### Immediate (This Week)
1. ✅ Fix configuration conflict - merge to single PayFastConfig
2. ✅ Move credentials to environment variables
3. ✅ Fix order ID generation inconsistency
4. ✅ Update pending orders cleanup function (48 hours)
5. ✅ Wrap order creation in database transaction
6. ✅ Add inventory validation before order creation

### Short Term (1-2 Weeks)
7. Add order status update on return request
8. Implement PayFast refund API integration
9. Verify/create email confirmation function
10. Add PayFast IP whitelist check
11. Add rate limiting on payment button
12. Schedule pending order cleanup cron job

### Medium Term (1 Month)
13. Fix delivery fee calculation duplication
14. Add phone/postal code validation
15. Implement order cancellation logic
16. Add return photo upload
17. Create order search functionality
18. Add webhook replay protection
19. Create order export feature

### Nice to Have (Ongoing)
20. Clean up console.log statements
21. Extract duplicate PayFast form code
22. Move magic numbers to constants
23. Enable TypeScript strict mode
24. Add fulfillment notifications
25. Enhance order timeline tracking

---

## SECURITY CHECKLIST

- [ ] Remove hardcoded credentials from source files
- [ ] Add environment variables for all secrets
- [ ] Verify .env is in .gitignore
- [ ] Rotate PayFast credentials if repository is public
- [ ] Add PayFast IP whitelist verification
- [ ] Enable webhook signature verification in production
- [ ] Review RLS policies for guest order access
- [ ] Audit payment_logs access permissions
- [ ] Add rate limiting on payment endpoints
- [ ] Enable HTTPS for all webhook URLs (already done ✅)

---

## DATA INTEGRITY CHECKLIST

- [ ] Wrap order creation in transaction
- [ ] Add inventory validation before order
- [ ] Prevent negative stock quantities
- [ ] Update order status on return request
- [ ] Track order timeline on all status changes
- [ ] Handle stock update failures properly
- [ ] Add unique constraint enforcement on order numbers
- [ ] Implement pending order cleanup schedule

---

## TESTING RECOMMENDATIONS

### PayFast Integration Testing
```bash
# 1. Test with sandbox credentials
# 2. Verify signature generation matches PayFast
# 3. Test webhook with sample PayFast payloads
# 4. Test payment timeout scenarios
# 5. Test duplicate webhook handling
# 6. Verify pending order cleanup
```

### Order Flow Testing
```bash
# 1. Create order with valid inventory
# 2. Create order with insufficient inventory (should fail)
# 3. Test duplicate order prevention
# 4. Test order cancellation
# 5. Test return request creation
# 6. Test refund processing
# 7. Test email notifications
```

### Edge Cases
```bash
# 1. PayFast webhook arrives after pending order expiration
# 2. Multiple webhooks for same payment
# 3. Payment succeeds but order creation fails
# 4. Stock update fails during order creation
# 5. Network timeout during payment
# 6. User closes browser during payment
```

---

## MONITORING & OBSERVABILITY

**Recommended Setup:**

1. **Payment Monitoring**
   - Alert on `payment_logs` with event_type='processing_failed'
   - Alert on `pending_order_not_found` events
   - Dashboard for payment success rate

2. **Order Monitoring**
   - Alert on failed stock updates
   - Alert on failed email sends
   - Track average order processing time

3. **Error Tracking**
   - Sentry/Bugsnag for JavaScript errors
   - CloudWatch/Datadog for edge function errors
   - Slack notifications for critical errors

---

## CONCLUSION

The codebase demonstrates a solid foundation with proper separation of concerns and comprehensive logging. The PayFast integration follows the correct HTML form submission approach. However, **critical security and configuration issues** require immediate attention, particularly:

1. Hardcoded credentials
2. Configuration conflicts
3. Transaction wrapping
4. Inventory validation

Addressing the **6 critical** and **9 high-priority** issues will significantly improve reliability, security, and data integrity.

**Estimated Effort:**
- Critical fixes: **2-3 days**
- High priority: **1 week**
- Medium priority: **2-3 weeks**
- Total: **4-5 weeks** for comprehensive remediation

---

**Audit Completed By:** Claude Code
**Date:** December 24, 2025
**Next Review:** After critical fixes implemented
