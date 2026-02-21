
# Order Management & Analytics — Comprehensive Fix Plan

## Issues Found

### Issue 1 — Payment Status Never Updates After Successful Payment (Critical)

When PayFast sends a `COMPLETE` webhook, the `process-order` edge function calls `create_order_transaction()` which hardcodes `payment_status = 'pending'`. After the order is created successfully, the function never updates `payment_status` to `paid` or stores the `payment_data` from PayFast.

**Evidence:** 2 of 4 orders in the database have `payment_status: pending` and `payment_data: null` despite being successfully paid via PayFast and progressed to `processing` or `completed` status.

**Fix:** After `create_order_transaction()` succeeds in `process-order/index.ts`, add an UPDATE to set `payment_status = 'paid'`, `payment_reference` to the PayFast payment ID, and `payment_data` to the full PayFast response. Also fix existing orders with a data migration.

### Issue 2 — OrdersTable Hardcodes "Paid" Badge

In `OrdersTable.tsx` line 188-190, the Payment column always shows a hardcoded "Paid" badge regardless of the actual `payment_status` value. This means cancelled, pending, and failed orders all incorrectly show as "Paid".

**Fix:** Replace the hardcoded badge with the actual `payment_status` value from the order, using proper color coding.

### Issue 3 — OrdersMetrics Shows Fake Trend Percentages

`OrdersMetrics.tsx` displays hardcoded strings like `+12.3%`, `+8.7%`, `+5.2%` as trend data. These are not calculated from real data.

**Fix:** Calculate actual period-over-period trends by comparing current 30-day metrics to the previous 30-day period.

### Issue 4 — Order Query Missing Total Count for Pagination

The `EnhancedOrderManagement` query uses `.range()` but does not include `{ count: 'exact' }` in the select options. This means `totalCount` is always `0` and pagination never shows.

**Fix:** Add `{ count: 'exact' }` to the query head option.

### Issue 5 — Existing Orders Need Payment Data Backfill

The 2 orders with `payment_status: pending` that were actually paid need to be corrected.

**Fix:** Update the 2 affected orders to `payment_status: 'paid'` since they were successfully processed through PayFast.

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/process-order/index.ts` | After successful order creation, UPDATE orders to set `payment_status = 'paid'`, `payment_reference`, and `payment_data` |
| `src/components/admin/orders/OrdersTable.tsx` | Replace hardcoded "Paid" badge with actual `payment_status` value and color coding |
| `src/components/admin/orders/OrdersMetrics.tsx` | Calculate real trend percentages by comparing to previous period |
| `src/components/admin/orders/EnhancedOrderManagement.tsx` | Add `{ count: 'exact' }` to order query for working pagination |
| `CHANGELOG.md` | Document all fixes |

## Data Fix

Update the 2 existing orders that have `payment_status: pending` but were successfully paid:
- `IKH-1771075308590-33EF2D3E` (status: processing)
- `IKH-1769430403649-58C64943` (status: completed)

Both should have `payment_status = 'paid'`.

## What Will NOT Change

- PayFast webhook handler — it correctly passes data to process-order
- `create_order_transaction()` DB function — it correctly creates orders atomically
- The `OrderDetailModal` — it already reads `payment_status` dynamically and displays it properly
- The `EnhancedOrderManagement` list view — it already reads `payment_status` from the order and shows dynamic badges
- All payment flows, auth, and checkout — untouched
- Analytics dashboard (`AdvancedAnalyticsDashboard`) — already well-implemented with real data

## Technical Details

### process-order fix (after line 281):
```typescript
// Update payment status to paid after successful order creation
await supabase
  .from('orders')
  .update({
    payment_status: 'paid',
    payment_reference: paymentData?.pf_payment_id || null,
    payment_data: paymentData || null,
  })
  .eq('id', orderResult.order_id);
```

### OrdersTable payment badge fix:
Replace the hardcoded `<Badge>Paid</Badge>` with dynamic status reading `order.payment_status`, using color-coded badges (green for paid/completed, yellow for pending, red for failed).

### OrdersMetrics trend calculation:
Compare current 30-day totals against previous 30-day totals to compute real percentage changes instead of displaying fake hardcoded values.

### Pagination fix:
Change the query from `.select(...)` to `.select(..., { count: 'exact' })` so `count` is returned and pagination controls work.
