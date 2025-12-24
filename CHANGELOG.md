# Changelog

All notable changes to the Ikhaya Homeware e-commerce platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
