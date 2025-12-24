# Implementation Guides

This directory contains step-by-step implementation guides for fixing critical issues identified in the comprehensive codebase audit.

---

## Quick Reference

| Priority | Guide | Issue | Time | Status |
|----------|-------|-------|------|--------|
| 🔴 CRITICAL | [01-transaction-wrapper.md](./01-transaction-wrapper.md) | No transaction wrapping for orders | 2-3 hours | ✅ Complete |
| 🔴 CRITICAL | [03-order-id-standardization.md](./03-order-id-standardization.md) | Inconsistent order ID formats | 1 hour | ✅ Complete |
| 🔴 CRITICAL | See [ENVIRONMENT.md](../ENVIRONMENT.md) | Hardcoded credentials | 2 hours | ✅ Complete |

---

## Implementation Order

**CRITICAL FIXES (Do First - This Week):**

1. **Environment Variables (SECURITY)** - 2 hours
   - **Guide:** `docs/ENVIRONMENT.md`
   - **Why First:** Fixes critical security vulnerability
   - **Impact:** Removes hardcoded credentials from source code
   - **Prerequisites:** None
   - **Deliverables:**
     - Updated `.env` file
     - Lovable.dev environment configured
     - Supabase secrets configured
     - Deleted `/src/utils/payment/constants.ts`
     - Updated `PayFastConfig.ts`

2. **Order ID Standardization** - 1 hour
   - **Guide:** `docs/implementation/03-order-id-standardization.md`
   - **Why Second:** Required for transaction wrapper
   - **Impact:** Consistent order IDs across codebase
   - **Prerequisites:** None
   - **Deliverables:**
     - Single `generateOrderId()` function
     - Updated 4 files using old patterns
     - Unit tests added

3. **Transaction Wrapper** - 2-3 hours
   - **Guide:** `docs/implementation/01-transaction-wrapper.md`
   - **Why Third:** Requires standardized order IDs
   - **Impact:** Atomic order creation, data integrity
   - **Prerequisites:** Order ID standardization
   - **Deliverables:**
     - Database migration applied
     - Updated `process-order` edge function
     - Tested with sandbox PayFast
     - Monitoring configured

---

## Not Yet Created (Planned)

### High Priority Guides

- **02-environment-variables.md** → Migrated to `docs/ENVIRONMENT.md` ✅
- **04-inventory-validation.md** - Add stock checks before order creation
- **05-refund-api-integration.md** - Implement PayFast refund API
- **06-return-status-update.md** - Update order status on return request
- **07-payfast-ip-whitelist.md** - Add IP verification to webhook
- **08-rate-limiting.md** - Prevent payment button spam

### Medium Priority Guides

- **09-delivery-fee-centralization.md** - Single source for fee logic
- **10-form-validation.md** - Phone & postal code validation
- **11-order-cancellation.md** - Cancellation with refund & restock
- **12-cron-scheduling.md** - Schedule pending order cleanup

---

## Using These Guides

Each implementation guide follows this structure:

1. **Problem Statement** - What's wrong and why it matters
2. **Solution Overview** - High-level approach
3. **Implementation Steps** - Detailed, copy-paste ready instructions
4. **Code Examples** - Before/after comparisons
5. **Testing** - How to verify the fix works
6. **Rollback Plan** - How to undo if needed
7. **Checklist** - Task list to ensure completion

---

## Prerequisites

Before implementing any guide, ensure you have:

- [ ] Local development environment running
- [ ] Supabase CLI installed and configured
- [ ] Access to Supabase project dashboard
- [ ] Access to Lovable.dev project dashboard
- [ ] Access to PayFast merchant account
- [ ] Git branch created for changes
- [ ] Backup of database (if making schema changes)

---

## Testing Workflow

For each implementation:

1. **Read Guide Completely** - Don't skip ahead
2. **Create Feature Branch** - `git checkout -b fix/issue-name`
3. **Implement Changes** - Follow guide step-by-step
4. **Test Locally** - Use sandbox mode for PayFast
5. **Test Integration** - End-to-end checkout flow
6. **Apply to Staging** - If you have staging environment
7. **Monitor Logs** - Check for errors
8. **Apply to Production** - During low-traffic period
9. **Monitor Production** - Watch for issues

---

## Deployment Notes

**Lovable.dev + Supabase Architecture:**

```
User Browser
    ↓
Lovable.dev (Frontend)
    ↓
Supabase (Backend)
    ↓
PayFast (Payment Gateway)
```

**What Gets Deployed Where:**

| Component | Deployment Target | Method |
|-----------|------------------|--------|
| React components | Lovable.dev | Git push (auto-deploy) |
| Environment variables (frontend) | Lovable.dev dashboard | Manual configuration |
| Database migrations | Supabase | `supabase db push` |
| Edge functions | Supabase | `supabase functions deploy` |
| Secrets (backend) | Supabase dashboard | Manual configuration |

---

## Rollback Procedures

If an implementation causes issues:

**Code Changes:**
```bash
git revert <commit-hash>
git push
# Lovable.dev auto-deploys reverted code
```

**Database Migrations:**
```bash
# List migrations
supabase migration list

# Revert specific migration
supabase migration down <migration-timestamp>

# Push to production
supabase db push
```

**Edge Functions:**
```bash
# Revert function code in git
git checkout HEAD^ -- supabase/functions/function-name/

# Redeploy
supabase functions deploy function-name
```

---

## Getting Help

**During Implementation:**

1. Check guide's **Troubleshooting** section
2. Check `AUDIT_REPORT.md` for context
3. Check Supabase function logs:
   ```bash
   supabase functions logs function-name --tail
   ```
4. Check browser console for frontend errors
5. Check `payment_logs` table for PayFast issues:
   ```sql
   SELECT * FROM payment_logs
   ORDER BY created_at DESC
   LIMIT 20;
   ```

**Resources:**

- **Main Audit Report:** `/AUDIT_REPORT.md`
- **Changelog:** `/CHANGELOG.md`
- **Environment Setup:** `/docs/ENVIRONMENT.md`
- **PayFast Docs:** https://developers.payfast.co.za/
- **Supabase Docs:** https://supabase.com/docs
- **Lovable.dev Docs:** https://docs.lovable.dev/

---

## Tracking Progress

**Update CHANGELOG.md** after completing each fix:

```markdown
## [Unreleased]

### Fixed
- ✅ [CRITICAL] Removed hardcoded PayFast credentials
- ✅ [CRITICAL] Standardized order ID generation
- ✅ [CRITICAL] Added transaction wrapping to order creation
- [ ] Add inventory validation before order creation
- [ ] Implement PayFast refund API
```

**Update Audit Report Status:**

In `AUDIT_REPORT.md`, mark issues as resolved:

```markdown
### 1. PayFast Configuration Conflict
**Status:** ✅ RESOLVED (2025-12-24)
**Solution:** Deleted constants.ts, consolidated to PayFastConfig.ts
**Commit:** abc123def
```

---

## Success Metrics

After implementing all critical fixes, you should see:

✅ **Security:**
- Zero hardcoded credentials in source code
- All secrets in environment variables
- PayFast IP whitelist active

✅ **Data Integrity:**
- Zero orphaned orders (order without items)
- Zero inventory mismatches
- All order creations are atomic

✅ **Reliability:**
- >99% order creation success rate
- Zero duplicate orders
- Zero payment/order mismatches

✅ **Code Quality:**
- Single order ID format
- Consistent error handling
- Comprehensive logging

---

## Contact

For questions or issues with these guides:

1. Review the specific guide's troubleshooting section
2. Check the main `AUDIT_REPORT.md` for additional context
3. Consult team lead or senior developer
4. Document any issues found in the guides

---

**Created:** 2025-12-24
**Last Updated:** 2025-12-24
**Total Guides:** 3 (more planned)
**Completion Status:** 3/37 critical issues resolved

---

## Implementation History

### 2025-12-24 - Critical Fixes Applied

| Fix | Description | Migration/File |
|-----|-------------|----------------|
| ✅ Hardcoded Credentials | Moved to environment variables | `PayFastConfig.ts` |
| ✅ Order ID Standardization | Single `generateOrderId()` function | `PayFastConfig.ts` |
| ✅ Transaction Wrapper | Atomic order creation with JSONB return | `create_order_transaction()` |
| ✅ Cleanup Function Fix | Uses `expires_at` column properly | `cleanup_expired_pending_orders()` |
| ✅ Negative Stock Prevention | Trigger prevents stock < 0 | `check_stock_not_negative` trigger |
| ✅ Expired Orders Cleanup | Ran cleanup, 23 expired orders removed | Manual execution |

### Database Functions Updated

- `create_order_transaction(text, uuid, jsonb, jsonb, uuid)` → Returns JSONB with `{success, order_id, order_number, error}`
- `cleanup_expired_pending_orders()` → Fixed to use `expires_at` column
- `prevent_negative_stock()` → Trigger function to prevent negative stock
- `update_product_stock()` → Enhanced with proper validation

### Edge Functions Updated

- `process-order` → Uses transaction function, handles JSONB response
- `payfast-webhook` → Improved logging and error handling
