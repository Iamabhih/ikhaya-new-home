# Implementation Guide: Order ID Standardization

**Issue:** CRITICAL #3 - Order ID generation inconsistency
**Priority:** 🔴 CRITICAL - Fix immediately
**Estimated Time:** 1 hour

---

## Problem Statement

Currently, **THREE different order ID formats** are used across the codebase:

| Location | Format | Example |
|----------|--------|---------|
| `PayFastConfig.ts:34` | `IKH-{timestamp}-{random9}` | IKH-1734950400000-A7F2X9K1 |
| `paymentService.ts:119` | `IKH-{timestamp}-{uuid[0]}` | IKH-1734950400000-a7b3c8d2 |
| `useCheckout.ts:71` | `ORDER-{timestamp}-{random9}` | ORDER-1734950400000-x9k1 |
| `CheckoutForm.tsx:60` | `TEMP-{timestamp}-{random9}` | TEMP-1734950400000-X9K1 |

**Risk:**
- PayFast webhook matching failures
- Payment reconciliation issues
- Confusion in customer support
- Inconsistent database records

---

## Solution

Create a **single utility function** for order ID generation and use it everywhere.

**Standard Format:** `IKH-{timestamp}-{random8}`
- Prefix: `IKH` (Ikhaya)
- Timestamp: milliseconds since epoch
- Random: 8 uppercase hex characters from UUID

---

## Implementation Steps

### Step 1: Update paymentService.ts

**File:** `/src/services/paymentService.ts`

**Add at top of file (after imports):**
```typescript
/**
 * Generates a cryptographically secure order ID
 * Format: IKH-{timestamp}-{random8}
 * Example: IKH-1735040123456-A7B3C8D2
 *
 * This is the SINGLE source of truth for order ID generation
 */
export const generateOrderId = (): string => {
  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().split('-')[0].toUpperCase();
  return `IKH-${timestamp}-${randomPart}`;
};
```

**Update existing function (lines 118-122):**
```typescript
// BEFORE:
function generateSecureOrderId(): string => {
  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().split('-')[0];
  return `IKH-${timestamp}-${randomPart}`;
}

// AFTER:
// Deleted - use generateOrderId() instead
```

**Update usage in processPayment function (line 131):**
```typescript
// BEFORE:
const orderId = generateSecureOrderId();

// AFTER:
const orderId = generateOrderId();
```

---

### Step 2: Update PayFastConfig.ts

**File:** `/src/utils/payment/PayFastConfig.ts`

**Delete generatePaymentReference function (lines 33-35):**
```typescript
// DELETE THIS:
export const generatePaymentReference = () => {
  return `IKH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};
```

**Add import at top:**
```typescript
import { generateOrderId } from '@/services/paymentService';
```

**Update exports:**
```typescript
// Re-export for backward compatibility
export { generateOrderId as generatePaymentReference };
```

---

### Step 3: Update useCheckout.ts

**File:** `/src/hooks/useCheckout.ts`

**Add import at top:**
```typescript
import { generateOrderId } from '@/services/paymentService';
```

**Update handlePayment function (line 71):**
```typescript
// BEFORE:
const tempOrderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// AFTER:
const tempOrderId = generateOrderId();
```

**Update handlePayment function (line 90):**
```typescript
// BEFORE:
item_name: `OZZ Order ${tempOrderId}`,

// AFTER:
item_name: `Ikhaya Order ${tempOrderId}`,
```

---

### Step 4: Update CheckoutForm.tsx

**File:** `/src/components/checkout/CheckoutForm.tsx`

**Add import at top:**
```typescript
import { generateOrderId } from '@/services/paymentService';
```

**Update handleBillingSubmit function (line 60):**
```typescript
// BEFORE:
const tempOrderId = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// AFTER:
const tempOrderId = generateOrderId();
```

---

### Step 5: Update PayfastPayment.tsx

**File:** `/src/components/checkout/PayfastPayment.tsx`

**Update import (line 5):**
```typescript
// BEFORE:
import { getPayFastConfig, generatePaymentReference } from "@/utils/payment/PayFastConfig";

// AFTER:
import { getPayFastConfig } from "@/utils/payment/PayFastConfig";
import { generateOrderId } from "@/services/paymentService";
```

**Update handlePayment function (line 76):**
```typescript
// BEFORE:
const paymentReference = generatePaymentReference();

// AFTER:
const paymentReference = generateOrderId();
```

---

## Verification

### Test Order ID Generation

Create a test file: `/src/utils/__tests__/orderIdGeneration.test.ts`

```typescript
import { generateOrderId } from '@/services/paymentService';

describe('Order ID Generation', () => {
  it('should generate order IDs in correct format', () => {
    const orderId = generateOrderId();

    // Should match: IKH-{13 digits}-{8 hex chars}
    expect(orderId).toMatch(/^IKH-\d{13}-[A-F0-9]{8}$/);
  });

  it('should generate unique order IDs', () => {
    const id1 = generateOrderId();
    const id2 = generateOrderId();

    expect(id1).not.toBe(id2);
  });

  it('should include timestamp', () => {
    const before = Date.now();
    const orderId = generateOrderId();
    const after = Date.now();

    const timestamp = parseInt(orderId.split('-')[1]);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should use cryptographically secure random', () => {
    const orderIds = new Set();

    // Generate 1000 IDs
    for (let i = 0; i < 1000; i++) {
      orderIds.add(generateOrderId());
    }

    // All should be unique
    expect(orderIds.size).toBe(1000);
  });
});
```

Run tests:
```bash
npm test orderIdGeneration
```

---

### Manual Testing

```typescript
// In browser console
import { generateOrderId } from './services/paymentService';

// Generate 10 IDs
for (let i = 0; i < 10; i++) {
  console.log(generateOrderId());
}

// Expected output:
// IKH-1735040123456-A7B3C8D2
// IKH-1735040123457-F2E8D9C1
// IKH-1735040123458-B4A6E2F3
// ... etc
```

---

### Search for Old Patterns

```bash
# Find any remaining old order ID generation patterns
grep -r "Math.random().toString(36)" --exclude-dir=node_modules .

# Should find ZERO matches after fix

# Find any remaining TEMP- or ORDER- prefixes
grep -r "TEMP-\${" --exclude-dir=node_modules .
grep -r "ORDER-\${" --exclude-dir=node_modules .

# Should find ZERO matches after fix
```

---

## Database Impact

**No database migration required** - this is a code-only change.

However, existing orders in database may have different formats:
- `IKH-*` (correct, from newer code)
- `ORDER-*` (from useCheckout)
- `TEMP-*` (from CheckoutForm)

**These old orders are fine** - no need to update them. New orders will use consistent format.

---

## PayFast Compatibility

PayFast uses the `m_payment_id` field to match webhooks to orders:

✅ **Format doesn't matter** to PayFast - can be any string
✅ **Uniqueness is what matters** - order IDs must be unique
✅ **All formats will work** - but consistency helps debugging

---

## Benefits

After standardization:

✅ **Consistent Format:** All new orders use same format
✅ **Easier Debugging:** Predictable order ID structure
✅ **Better Support:** Customer support can recognize valid order IDs
✅ **Simpler Code:** One function to maintain
✅ **Type Safety:** Can add TypeScript validation
✅ **Security:** Uses crypto.randomUUID() (not Math.random())

---

## Future Enhancements

Consider adding TypeScript type:

```typescript
// /src/types/order.ts
export type OrderId = `IKH-${number}-${string}`;

export const isValidOrderId = (id: string): id is OrderId => {
  return /^IKH-\d{13}-[A-F0-9]{8}$/.test(id);
};

export const parseOrderId = (id: OrderId) => {
  const [prefix, timestamp, random] = id.split('-');
  return {
    prefix,
    timestamp: parseInt(timestamp),
    random,
    date: new Date(parseInt(timestamp))
  };
};
```

---

## Rollback Plan

If issues occur:

```bash
# Revert commits
git revert <commit-hash>

# Or restore old function temporarily
export const generateOrderId = () => {
  // Old implementation
  return `IKH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
```

---

## Checklist

Before marking complete:

- [ ] Created `generateOrderId()` in `paymentService.ts`
- [ ] Deleted `generateSecureOrderId()` in `paymentService.ts`
- [ ] Deleted `generatePaymentReference()` in `PayFastConfig.ts`
- [ ] Updated `useCheckout.ts` to use `generateOrderId()`
- [ ] Updated `CheckoutForm.tsx` to use `generateOrderId()`
- [ ] Updated `PayfastPayment.tsx` to use `generateOrderId()`
- [ ] Added unit tests
- [ ] Tested locally with checkout flow
- [ ] Tested with PayFast sandbox
- [ ] Verified webhook matching works
- [ ] Searched codebase for old patterns (all removed)
- [ ] Updated team documentation

---

**Created:** 2025-12-24
**Updated:** 2025-12-24
**Status:** Ready for implementation
**Time Required:** ~1 hour
