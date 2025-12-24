# Changelog

All notable changes to the Ikhaya Homeware e-commerce platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🔴 Critical Fixes Pending (DO FIRST)

#### SECURITY
- [ ] **URGENT**: Remove hardcoded PayFast passphrase `'Khalid123@Ozz'` from `/src/utils/payment/constants.ts:14`
- [ ] **URGENT**: Move all PayFast credentials to environment variables
- [ ] Add PayFast IP whitelist verification to webhook handler
- [ ] Rotate PayFast credentials if repository has been public

#### CONFIGURATION
- [ ] **URGENT**: Consolidate PayFast configuration - delete `constants.ts`, keep only `PayFastConfig.ts`
- [ ] Fix configuration conflict: `PayFastConfig.ts` (live) vs `constants.ts` (sandbox)
- [ ] Standardize order ID generation - currently 3 different formats in use

#### DATA INTEGRITY
- [ ] **URGENT**: Wrap order creation in database transaction (see `docs/implementation/01-transaction-wrapper.md`)
- [ ] **URGENT**: Add inventory validation BEFORE order creation
- [ ] Fix `cleanup_expired_pending_orders()` function - update from 2 hours to 48 hours
- [ ] Prevent negative stock quantities for all movement types

### 🟠 High Priority Fixes (Within 1-2 Weeks)

#### ORDERS & REFUNDS
- [ ] Update order status to `return_requested` when return is submitted
- [ ] Implement PayFast refund API integration (currently manual process only)
- [ ] Make stock update failures block order creation (currently fails silently)
- [ ] Add unique constraint handling for order creation race condition

#### PAYMENT PROCESSING
- [ ] Verify `send-order-confirmation` edge function exists (or create it)
- [ ] Add rate limiting on payment button (prevent double-submission)
- [ ] Implement payment timeout notifications (1 hour reminder)
- [ ] Add webhook replay protection with deduplication

#### INVENTORY
- [ ] Add stock availability check in checkout flow (before payment)
- [ ] Handle concurrent order race conditions with proper locking

### 🟡 Medium Priority (1 Month)

- [ ] Centralize delivery fee calculation (remove duplication in `useCheckout.ts`)
- [ ] Add phone number format validation (South African: `+27 XX XXX XXXX`)
- [ ] Add postal code validation (4 digits for South Africa)
- [ ] Schedule `cleanup_expired_pending_orders()` as cron job (hourly)
- [ ] Implement order cancellation with automatic refund + restock
- [ ] Add photo upload to return requests
- [ ] Create order search functionality in admin
- [ ] Add shipment notification emails with tracking

### 🟢 Low Priority Enhancements

- [ ] Extract duplicate PayFast form data preparation to utility
- [ ] Move `FREE_DELIVERY_THRESHOLD = 400` to config constant
- [ ] Enable TypeScript strict mode in `tsconfig.json`
- [ ] Replace remaining `console.log` with logger utility
- [ ] Add order export to CSV for admin
- [ ] Copy product images to permanent order snapshot storage
- [ ] Review and test bulk order actions error handling

### Added
- **AUDIT_REPORT.md** - Comprehensive codebase audit (37 issues identified)
- Prompt tracking system in `.lovable/prompts/`
- Implementation guides in `docs/implementation/`
- Environment variable documentation
- Supabase migration files for critical fixes
- Environment variable validation at application startup
- Production-safe logging utility (dev-only console logging)
- Cryptographically secure order ID generation (IKH-{timestamp}-{random} format)
- `.env.example` template for environment configuration
- Request logging system for tracking lovable.dev and Supabase synchronization
- Change tracking database migration

### Changed
- Order ID generation now uses `crypto.randomUUID()` instead of `Math.random()` for security
- Console logging replaced with conditional logger utility in payment service
- Package manager standardized to npm (removed bun.lockb)

### Fixed
- **SECURITY**: Added `.env` to `.gitignore` to prevent credential exposure
- **SECURITY**: Replaced insecure `Math.random()` order ID generation
- **SECURITY**: Wrapped all console.log statements in development-only checks

### Removed
- Bun lockfile (`bun.lockb`) - standardized on npm

---

## Version History

### [2.0.0] - 2025-12-24

#### Security Audit & Critical Fixes
- Comprehensive codebase audit completed
- Identified and documented 26 critical/high-priority security issues
- Security score: 3/10 (critical improvements needed)

**Critical Issues Addressed:**
1. ✅ Environment variable security (.env protection)
2. ✅ Secure order ID generation
3. ✅ Production logging cleanup
4. ⏳ TypeScript strict mode (in progress)
5. ⏳ Automated testing framework (planned)
6. ⏳ Rate limiting on edge functions (planned)
7. ⏳ CORS configuration hardening (planned)

---

## Change Categories

### Added
For new features.

### Changed
For changes in existing functionality.

### Deprecated
For soon-to-be removed features.

### Removed
For now removed features.

### Fixed
For any bug fixes.

### Security
In case of vulnerabilities.

---

## Lovable.dev Integration Notes

This project is integrated with lovable.dev for UI development and Supabase for backend services.

**Sync Protocol:**
- All database migrations are tracked in `supabase/migrations/`
- Changes from lovable.dev are logged in the `system_change_logs` table
- Request logs track all API interactions in `system_request_logs` table

**Important:** Always run migrations after pulling changes from lovable.dev to ensure database schema is synchronized.

---

## Migration Tracking

Database migrations are located in `supabase/migrations/` and are numbered sequentially.

To check migration status:
```bash
supabase migration list
```

To apply pending migrations:
```bash
supabase db push
```

---

Last Updated: 2025-12-24
