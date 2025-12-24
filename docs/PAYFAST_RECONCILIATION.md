# PayFast Payment Reconciliation Guide

## Overview

This guide explains how to handle and reconcile PayFast payments that were successfully processed but failed to create orders in the database.

## Problem Scenario

Sometimes a payment can be successfully processed by PayFast, but the order doesn't appear in the database. This typically happens when:

1. **Webhook Delay**: PayFast webhook takes longer than 48 hours to be delivered (rare but possible)
2. **Pending Order Expiration**: The pending_orders record expires before the webhook arrives
3. **System Issues**: Database errors or temporary outages during order creation

## Recent Fixes Applied

### 1. Payment Logs Table
- **Created**: `payment_logs` table to track all payment events
- **Purpose**: Complete audit trail of all PayFast webhook activity
- **Migration**: `20251223000001_create_payment_logs.sql`

### 2. Extended Expiration Time
- **Changed**: Pending orders expiration from 2 hours → 48 hours
- **Purpose**: Accommodate PayFast webhook delays
- **Migration**: `20251223000002_extend_pending_orders_expiration.sql`

### 3. Enhanced Error Handling
- **Updated**: `process-order` function with comprehensive logging
- **Added**: Detailed error messages for missing pending orders
- **Improved**: Better visibility into failure reasons

### 4. Reconciliation Function
- **Created**: `reconcile-payment` edge function
- **Purpose**: Identify and recover orphaned payments

## Using the Reconciliation Function

### 1. List Orphaned Payments

Find all payments that failed due to missing pending orders:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/reconcile-payment \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_orphaned"}'
```

**Response:**
```json
{
  "success": true,
  "orphanedPayments": [
    {
      "payment_id": "1234567",
      "m_payment_id": "ORD-20231223-ABC123",
      "payment_status": "COMPLETE",
      "created_at": "2023-12-23T10:30:00Z",
      "event_data": {...}
    }
  ],
  "count": 1
}
```

### 2. Get Payment Details

Investigate a specific payment by order number or payment ID:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/reconcile-payment \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_payment_details", "orderNumber": "ORD-20231223-ABC123"}'
```

**Response:**
```json
{
  "success": true,
  "paymentLogs": [...],
  "orderExists": false,
  "orderData": null
}
```

### 3. Generate Reconciliation Report

Get overall payment processing statistics:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/reconcile-payment \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_report"}'
```

**Response:**
```json
{
  "success": true,
  "report": {
    "totalEvents": 1523,
    "webhooksReceived": 450,
    "successfulProcessing": 448,
    "failedProcessing": 2,
    "orphanedPayments": 1,
    "successRate": "99.56%"
  }
}
```

## Manual Recovery Process

When you identify an orphaned payment, follow these steps:

### Step 1: Verify Payment with PayFast

1. Log into PayFast dashboard
2. Search for the payment using the `pf_payment_id` or `m_payment_id`
3. Confirm the payment status is "Complete" and amount is correct

### Step 2: Check Payment Logs

Query the payment_logs table to understand what happened:

```sql
SELECT * FROM payment_logs
WHERE m_payment_id = 'ORD-20231223-ABC123'
ORDER BY created_at DESC;
```

Look for:
- `pending_order_not_found` event (indicates expired pending order)
- `processing_failed` event (indicates processing errors)
- Error messages and details

### Step 3: Recovery Options

#### Option A: Customer Re-orders (Recommended)

If pending order data is lost:

1. Contact the customer with their payment reference
2. Confirm they want to proceed with the order
3. Ask them to place a new order
4. Issue a refund for the original payment via PayFast dashboard
5. Apply a discount code equal to the refund amount

#### Option B: Manual Order Creation (If Data Available)

If you have the customer's cart and delivery information:

1. Create an order manually in the database
2. Match the order_number to the PayFast payment reference
3. Set payment_status to 'paid'
4. Send order confirmation email to customer

```sql
-- Example manual order creation (USE WITH CAUTION)
INSERT INTO orders (
  order_number,
  user_id,
  status,
  payment_status,
  total_amount,
  shipping_address,
  payment_method,
  payment_data,
  notes
) VALUES (
  'ORD-20231223-ABC123',
  'user-uuid-here',
  'confirmed',
  'paid',
  999.99,
  '{"firstName": "John", "lastName": "Doe", ...}'::jsonb,
  'payfast',
  '{"pf_payment_id": "1234567", ...}'::jsonb,
  'Manually reconciled payment - original webhook failed'
);
```

### Step 4: Document the Resolution

Add a note to the payment_logs:

```sql
INSERT INTO payment_logs (
  payment_id,
  m_payment_id,
  payment_status,
  event_type,
  event_data,
  error_message
) VALUES (
  '1234567',
  'ORD-20231223-ABC123',
  'COMPLETE',
  'processing_completed',
  '{"manual_reconciliation": true, "resolved_by": "admin@example.com"}'::jsonb,
  'Manually reconciled and order created'
);
```

## Monitoring and Prevention

### Monitoring

Set up alerts for:

1. **Orphaned Payments**: Query for `pending_order_not_found` events daily
2. **Failed Processing**: Monitor `processing_failed` events
3. **Success Rate**: Track the percentage of successful order creations

### Prevention

The fixes applied should prevent most issues:

1. ✅ 48-hour pending order expiration (vs 2 hours before)
2. ✅ Comprehensive payment logging
3. ✅ Retry logic in webhook handler (3 retries)
4. ✅ Backup order processing on success page

### Database Queries for Monitoring

**Check for recent orphaned payments:**
```sql
SELECT
  m_payment_id,
  payment_status,
  created_at,
  error_message
FROM payment_logs
WHERE event_type = 'pending_order_not_found'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Check payment processing success rate:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE event_type = 'webhook_received') as webhooks,
  COUNT(*) FILTER (WHERE event_type = 'processing_completed') as success,
  COUNT(*) FILTER (WHERE event_type = 'pending_order_not_found') as orphaned
FROM payment_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Support Contacts

- **PayFast Support**: https://www.payfast.co.za/support/
- **PayFast Status**: https://status.payfast.co.za/

## Changelog

- **2023-12-23**: Initial reconciliation system implemented
  - Created payment_logs table
  - Extended pending_orders expiration to 48 hours
  - Added reconcile-payment edge function
  - Enhanced error logging in process-order function
