
# Full System Stabilisation — Concurrent Implementation

## What Is Being Fixed

This implements all remaining audit findings identified in the previous plan review. Payment processing is **fully preserved** — the PayFast → webhook → process-order chain is kept intact; only the deprecated `serve()` import and the broken email function name are corrected.

---

## Critical Fix: `process-order` Sends Confirmation Email to Non-Existent Function

**Current broken code (line 286):**
```
supabase.functions.invoke('send-order-confirmation', {...})
```
`send-order-confirmation` does not exist. Every successful payment silently fails to send a confirmation email.

**Fix:** Replace with the correct call to `send-email` with `type: 'order-confirmation'`, mapping the pending order's cart items, customer name, totals, and address into the payload that `generateOrderConfirmationHtml()` already expects.

**Payment flow is NOT changed.** The PayFast form submission, webhook receiver, retry logic, and `create_order_transaction` RPC call are all preserved exactly.

---

## Edge Functions — `Deno.serve()` Modernisation

Replace deprecated `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"` + `serve(async (req) => {` with `Deno.serve(async (req: Request) => {` (no import needed) in 5 functions:

| Function | Current | Fixed |
|---|---|---|
| `process-order` | `serve(...)` from std@0.168 | `Deno.serve(...)` |
| `payfast-webhook` | `serve(...)` from std@0.168 | `Deno.serve(...)` |
| `reconcile-payment` | `serve(...)` from std@0.168 | `Deno.serve(...)` |
| `get-shipping-rates` | `serve(...)` from std@0.168 | `Deno.serve(...)` |
| `manage-api-key` | `serve(...)` from std@0.168 | `Deno.serve(...)` |
| `create-shipment` | `serve(...)` from std@0.168 | `Deno.serve(...)` |
| `analytics-stream` | `serve(...)` from std@0.168 | `Deno.serve(...)` |

`send-email`, `send-order-notification`, `send-recovery-email` already use `std@0.190.0` — these are left unchanged.

**Note for `analytics-stream`:** This is a WebSocket function. `Deno.serve()` is fully compatible with `Deno.upgradeWebSocket()` — no functional change.

---

## `send-order-notification` — Remove Invalid `tracking_company` Column Reference

**Issue:** Line 248 references `order.tracking_company` but the `orders` table has no such column. This produces `undefined` silently in the shipment email template.

**Fix:** The `generateShipmentEmail` function already wraps this in a conditional `${order.tracking_company ? ...}` — because it evaluates to `undefined`, it simply renders nothing. The safest fix is to source it from `metadata` (which is passed when the function is called from the admin panel fulfillment flow) instead of `order.tracking_company`. Change:
```
${order.tracking_company ? `<p><strong>Carrier:</strong> ${order.tracking_company}</p>` : ''}
```
To:
```
${(metadata?.tracking_company || order.tracking_number) ? `<p><strong>Carrier:</strong> ${metadata?.tracking_company || 'ShipLogic'}</p>` : ''}
```

---

## Database Migration — Security Hardening

### Part 1: Add `SET search_path = public` to 4 functions that are missing it

The linter flagged `function_search_path_mutable` for functions without pinned search paths. The following still need it:

- `handle_updated_at` (trigger function, no SET search_path)
- `update_campaigns_updated_at` (trigger function, no SET search_path)
- `update_updated_at_column` (trigger function, no SET search_path)
- `update_product_stock` (older single-argument overload, no SET search_path)
- `search_products` (STABLE function, no SET search_path)
- `generate_quote_number` (no SET search_path)
- `set_quote_number` (no SET search_path)

Migration SQL:
```sql
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.update_campaigns_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_product_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.search_products(text, uuid, numeric, numeric, boolean, integer, integer) SET search_path = public;
ALTER FUNCTION public.generate_quote_number() SET search_path = public;
ALTER FUNCTION public.set_quote_number() SET search_path = public;
```

### Part 2: Tighten Permissive RLS Policies on Tracking/Batch Tables

Tables with `USING (true)` on ALL or UPDATE operations that should be restricted. The fix narrows write access to service-role callers only (which is how these tables are written to — exclusively from edge functions using the service role key):

- `auth_rate_limits` — drop ALL `USING (true)`, add INSERT for anon + UPDATE/DELETE for service role
- `batch_progress` — restrict to authenticated + service role
- `cart_analytics_snapshots` — restrict writes to service role
- `cart_sessions` — restrict UPDATE to authenticated users owning the session
- `customer_engagement_metrics` — restrict to service role
- `enhanced_cart_tracking` — restrict to authenticated + service role
- `processing_sessions` — restrict to service role
- `order_status_history` — restrict writes to authenticated (admin check exists in app layer)

---

## `App.tsx` — JSX Indentation Cleanup

The JSX nesting is functionally correct but uses mixed 2-space/4-space indentation and has `<Toaster />` and `<SecurityMonitor />` outside `<BrowserRouter>`. Fix: move them inside `<BrowserRouter>` and standardise indentation throughout. `<WhatsAppChatWidget />` is already correctly placed inside `<BrowserRouter>` from the previous audit.

---

## Documentation Updates

- `CHANGELOG.md`: Add new entry documenting all fixes in this session
- `README.md`: Update system status, note the 7 linter warnings that remain as dashboard-only items (OTP expiry, leaked password protection, Postgres version)

---

## What Is Preserved — Payment Processing Guarantee

| Component | Status |
|---|---|
| PayFast form submission (no signature) | PRESERVED — architectural constraint respected |
| PayFast webhook → process-order chain | PRESERVED — only serve() import updated |
| 3-retry logic in payfast-webhook | PRESERVED |
| `create_order_transaction` RPC call | PRESERVED |
| Payment settings (merchant_id, key, passphrase) | PRESERVED |
| Pending order 48-hour expiry | PRESERVED |
| Reconciliation function logic | PRESERVED — only serve() updated |
| Admin email notifications on payment failures | PRESERVED |

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/process-order/index.ts` | `Deno.serve()` + fix email to call `send-email` correctly |
| `supabase/functions/payfast-webhook/index.ts` | `Deno.serve()` only |
| `supabase/functions/reconcile-payment/index.ts` | `Deno.serve()` only |
| `supabase/functions/get-shipping-rates/index.ts` | `Deno.serve()` only |
| `supabase/functions/manage-api-key/index.ts` | `Deno.serve()` only |
| `supabase/functions/create-shipment/index.ts` | `Deno.serve()` only |
| `supabase/functions/analytics-stream/index.ts` | `Deno.serve()` only |
| `supabase/functions/send-order-notification/index.ts` | Fix `tracking_company` reference |
| `src/App.tsx` | JSX indentation cleanup |
| `CHANGELOG.md` | Document this audit session |
| `README.md` | Update system status |
| **DB Migration** | `SET search_path` on 7 functions + tighten 8 RLS policies |

All deployed functions will be redeployed automatically after changes.
