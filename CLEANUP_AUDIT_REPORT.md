# Ecommerce Cleanup Audit Report

**Date:** January 28, 2026
**Auditor:** Claude Code
**Branch:** claude/audit-cleanup-ecommerce-PKflk

---

## Executive Summary

This audit identifies old code, unused components, and cleanup opportunities in the Ikhaya ecommerce codebase. Items are prioritized by safety and impact.

**CLEANUP COMPLETED:** 15 unused components deleted, 4 unused dependencies removed. Build verified successful.

---

## 1. UNUSED COMPONENTS - CLEANED UP

The following components were identified as unused and have been **DELETED**:

### Deleted Components (15 files removed)

| Component | Former Path | Status |
|-----------|-------------|--------|
| `EnhancedProductImageManager` | `src/components/admin/EnhancedProductImageManager.tsx` | DELETED |
| `EnhancedRealTimeMetrics` | `src/components/admin/analytics/EnhancedRealTimeMetrics.tsx` | DELETED |
| `EnhancedOrderList` | `src/components/admin/orders/EnhancedOrderList.tsx` | DELETED |
| `OrderList` | `src/components/admin/OrderList.tsx` | DELETED |
| `MissingImageReportTool` | `src/components/admin/MissingImageReportTool.tsx` | DELETED |
| `ConditionalScriptLoader` | `src/components/common/ConditionalScriptLoader.tsx` | DELETED |
| `EmergencyLoader` | `src/components/common/EmergencyLoader.tsx` | DELETED |
| `BrowserCompatibilityChecker` | `src/components/common/BrowserCompatibilityChecker.tsx` | DELETED |
| `ReportGenerator` | `src/components/analytics/ReportGenerator.tsx` | DELETED |
| `PremiumAnalyticsCharts` | `src/components/admin/analytics/PremiumAnalyticsCharts.tsx` | DELETED |
| `EnhancedProductGallery` | `src/components/admin/EnhancedProductGallery.tsx` | DELETED |
| `ProductTableView` | `src/components/admin/ProductTableView.tsx` | DELETED |
| `BulkOperationsPanel` | `src/components/admin/BulkOperationsPanel.tsx` | DELETED |
| `MobileSafeLoader` | `src/components/common/MobileSafeLoader.tsx` | DELETED |
| `OptimizedProductSearch` | `src/components/products/OptimizedProductSearch.tsx` | DELETED |

---

## 2. UNUSED DEPENDENCIES - CLEANED UP

The following npm packages were in `package.json` but **never imported** and have been **REMOVED**:

| Package | Notes | Status |
|---------|-------|--------|
| `react-pdf` | PDFPreview component doesn't use it - just renders download button | REMOVED |
| `js-md5` | Was likely used for PayFast MD5 but no longer imported | REMOVED |
| `crypto-js` | Only referenced in docs, not actually imported | REMOVED |
| `@types/crypto-js` | Type definitions for unused package | REMOVED |

**Executed:**
```bash
npm uninstall react-pdf js-md5 crypto-js @types/crypto-js
```

---

## 3. UNUSED/POTENTIALLY UNUSED EDGE FUNCTIONS

The following Supabase Edge Functions exist but have **no client-side invocations**:

| Function | Path | Notes |
|----------|------|-------|
| `analytics-stream` | `supabase/functions/analytics-stream/` | No `functions.invoke` calls found |
| `create-shipment` | `supabase/functions/create-shipment/` | No `functions.invoke` calls found |
| `link-product-images` | `supabase/functions/link-product-images/` | No `functions.invoke` calls found - replaced by `master-image-linker`? |
| `reconcile-payment` | `supabase/functions/reconcile-payment/` | Only documented, not invoked from UI |

**Note:** These may be called via cron jobs, webhooks, or manual invocation. Verify before deleting.

---

## 4. CONSOLE.LOG STATEMENTS TO REMOVE

Found **100+ console.log statements** throughout the codebase. Key areas:

### Production-Critical Files (Remove Before Production)
- `src/main.tsx` - 5 console.log statements
- `src/contexts/AuthContext.tsx` - 4 console.log statements
- `src/hooks/useCart.ts` - 8 console.log statements
- `src/components/checkout/PayFastForm.tsx` - 8 console.log statements
- `src/components/checkout/PayfastPayment.tsx` - 6 console.log statements

### Admin/Debug Files (Lower Priority)
- `src/components/admin/AdminSidebar.tsx` - 5 console.log statements
- `src/components/admin/HistoricalOrderCreator.tsx` - 15 console.log statements
- `src/components/admin/MasterImageLinker.tsx` - 7 console.log statements
- `src/hooks/useRoles.ts` - 5 console.log statements
- `src/utils/backgroundRemoval.ts` - 15 console.log statements

**Recommendation:** Replace with `appLogger` utility or remove entirely for production.

---

## 5. TODO/FIXME COMMENTS

| File | Line | Comment |
|------|------|---------|
| `src/utils/security.ts` | 162 | `// TODO: Implement proper security logging endpoint when needed` |
| `src/components/admin/MultiImageUploader.tsx` | 2 | `// TODO: Add react-dropzone dependency` |

---

## 6. DEPRECATED CODE PATTERNS

| File | Line | Pattern |
|------|------|---------|
| `src/test/setup.ts` | 39-40 | Uses deprecated EventEmitter methods: `addListener`, `removeListener` |
| `src/styles/browser-compatibility.css` | 12 | Note about deprecated `@-moz-document` |

---

## 7. TYPE SAFETY ISSUES

Found **295 instances** of `any` type usage across 114 files. Top offenders:

| File | Count | Notes |
|------|-------|-------|
| `src/components/admin/ManualImageLinker.tsx` | 13 | Heavy any usage |
| `src/components/admin/PromotionalBannersManagement.tsx` | 12 | Heavy any usage |
| `src/components/home/PromotionalBanners.tsx` | 10 | Heavy any usage |
| ~~`src/components/admin/BulkOperationsPanel.tsx`~~ | ~~9~~ | DELETED |
| `src/components/admin/ImageAuditTool.tsx` | 7 | |
| `src/components/admin/HomepageSettings.tsx` | 7 | |
| `src/hooks/useCartAnalytics.ts` | 7 | |

---

## 8. COMMENTED-OUT IMPORTS

| File | Line | Import |
|------|------|--------|
| `src/integrations/supabase/client.ts` | 9 | `// import { supabase } from "@/integrations/supabase/client";` |
| `src/components/admin/MultiImageUploader.tsx` | 2 | `// import { useDropzone } from 'react-dropzone';` |

---

## 9. TESTING PANELS IN PRODUCTION

The following testing/diagnostic panels are included in production admin pages. Consider removing or feature-flagging:

| Component | Used In | Notes |
|-----------|---------|-------|
| `OrderTestingPanel` | `AdminOrders.tsx` | Creates test orders |
| `ProductTestingPanel` | `SuperAdminSettings.tsx` | Creates test products |
| `AnalyticsTestPanel` | `AdvancedAnalyticsDashboard.tsx` | Tests analytics |

---

## 10. REDUNDANT COMPONENT VARIANTS

Multiple versions of similar components exist. Consider future consolidation:

### Analytics Components (Cleaned)
- `RealTimeMetrics` (USED)
- `ImprovedRealTimeMetrics` (USED)
- `PremiumRealTimeMetrics` (USED)
- ~~`EnhancedRealTimeMetrics`~~ (DELETED)

### Charts (Cleaned)
- `AnalyticsCharts` (USED)
- `ImprovedAnalyticsCharts` (USED)
- ~~`PremiumAnalyticsCharts`~~ (DELETED)

### Loading Components (6 variants - all used differently)
- `LoadingSpinner`
- `UniversalLoading`
- `LoadingWrapper`
- `LoadingState`
- `UnifiedLoadingSkeleton`
- `LoadingStates`

---

## Cleanup Completed

### Phase 1: Safe Deletions - COMPLETED

- 15 unused components deleted
- 4 unused npm packages removed
- Build verified successful

### Phase 2: Remaining Work (Needs Manual Review)
- Check if Edge Functions are called via cron jobs or other mechanisms before deleting
- Review testing panels - consider environment-based feature flags for production
- Consider removing `react-beautiful-dnd` (deprecated) in favor of `@dnd-kit`

### Phase 3: Future Code Quality Improvements
- Replace 100+ console.log statements with `appLogger` utility
- Address type safety issues (295 `any` usages across 114 files)
- Clean up deprecated EventEmitter patterns in test setup
- Consolidate redundant component variants (multiple analytics/loading components)

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| Unused Components | 15 files | DELETED |
| Unused Dependencies | 4 packages | REMOVED |
| Potentially Unused Edge Functions | 4 functions | Needs Review |
| Console.log Statements | 100+ instances | Future Cleanup |
| Type Safety Issues (any) | 295 instances | Future Cleanup |
| TODO/FIXME Comments | 2 | Future Cleanup |
| Deprecated Patterns | 2 | Future Cleanup |

---

## Build Verification

Build completed successfully after cleanup:
- 3771 modules transformed
- All chunks generated correctly
- PWA assets generated

---

*This report was generated and cleanup executed as part of the ecommerce audit on January 28, 2026.*
