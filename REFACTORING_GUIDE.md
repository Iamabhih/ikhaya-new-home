# Large Component Refactoring Guide
**Ikhaya Homeware - Technical Improvement**

**Created:** January 6, 2026
**Status:** Ready for Implementation

---

## 🎯 Overview

This guide provides detailed refactoring plans for the 6 largest components in the codebase. Each requires careful splitting to improve maintainability without breaking functionality.

---

## 📊 Components to Refactor

| Component | Lines | Priority | Estimated Effort |
|-----------|-------|----------|------------------|
| ManualImageLinker.tsx | 986 | High | 8-10 hours |
| PromotionalBannersManagement.tsx | 934 | High | 6-8 hours |
| MasterImageLinker.tsx | 824 | Medium | 8-10 hours |
| sidebar.tsx | 761 | Low | 4-6 hours |
| EnhancedOrderManagement.tsx | 724 | Medium | 6-8 hours |
| EnhancedProductGallery.tsx | 717 | Medium | 5-7 hours |

**Total Estimated Effort:** 37-49 hours

---

## 1️⃣ PromotionalBannersManagement.tsx (934 lines)

### Current Structure
Single monolithic component handling:
- Banner list display
- Create/edit form
- Preview functionality
- Image upload
- Styling controls
- Position management

### Refactoring Plan

**Split into 3 components:**

#### 1.1 BannerList.tsx (~200 lines)
```typescript
// Responsibilities:
// - Display banners in list/grid
// - Sort/filter functionality
// - Delete/activate actions
// - Position reordering

interface BannerListProps {
  banners: PromotionalBanner[];
  onEdit: (banner: PromotionalBanner) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onReorder: (bannerId: string, direction: 'up' | 'down') => void;
}
```

#### 1.2 BannerForm.tsx (~500 lines)
```typescript
// Responsibilities:
// - Form fields and validation
// - Image upload integration
// - Style customization
// - Date range selection

interface BannerFormProps {
  banner?: PromotionalBanner | null;
  onSave: (data: BannerFormData) => Promise<void>;
  onCancel: () => void;
}
```

#### 1.3 BannerPreview.tsx (~150 lines)
```typescript
// Responsibilities:
// - Live preview rendering
// - Style preview
// - Responsive preview

interface BannerPreviewProps {
  formData: BannerFormData;
  className?: string;
}
```

#### 1.4 PromotionalBannersManagement.tsx (~100 lines)
```typescript
// Orchestration only:
// - State management
// - Data fetching
// - Compose child components
```

### Implementation Steps
1. Create `BannerPreview.tsx` (smallest, easiest)
2. Extract `BannerForm.tsx` (most complex)
3. Extract `BannerList.tsx`
4. Simplify main component to orchestration
5. Test all CRUD operations
6. Test live preview
7. Test image uploads

---

## 2️⃣ ManualImageLinker.tsx (986 lines)

### Current Structure
Massive component handling:
- Product search
- Image search
- Manual linking
- Bulk operations
- Preview functionality

### Refactoring Plan

**Split into 4 components:**

#### 2.1 ProductSearchPanel.tsx (~200 lines)
- Product search and filtering
- Product selection
- Product display

#### 2.2 ImageSearchPanel.tsx (~250 lines)
- Storage image search
- Image filtering
- Image grid display
- Image preview

#### 2.3 LinkingActions.tsx (~200 lines)
- Link/unlink operations
- Bulk actions
- Confirmation dialogs

#### 2.4 ImageLinkingPreview.tsx (~150 lines)
- Side-by-side preview
- Link status display
- Metadata display

#### 2.5 ManualImageLinker.tsx (~200 lines)
- Layout and orchestration
- State management
- API calls

### Implementation Steps
1. Extract `ImageLinkingPreview.tsx`
2. Extract `ProductSearchPanel.tsx`
3. Extract `ImageSearchPanel.tsx`
4. Extract `LinkingActions.tsx`
5. Simplify main component
6. Test linking workflow
7. Test bulk operations

---

## 3️⃣ MasterImageLinker.tsx (824 lines)

### Current Structure
AI-powered image matching system:
- Automated matching
- Confidence scoring
- Bulk approval
- Manual overrides

### Refactoring Plan

**Split into 4 components:**

#### 3.1 MatchingDashboard.tsx (~200 lines)
- Summary statistics
- Filter controls
- Confidence thresholds

#### 3.2 MatchingSuggestions.tsx (~300 lines)
- AI match display
- Confidence scores
- Preview images

#### 3.3 BulkApprovalPanel.tsx (~150 lines)
- Bulk selection
- Approve/reject actions
- Progress tracking

#### 3.4 MatchingEngine.tsx (~100 lines)
- Matching logic
- API calls
- State management

#### 3.5 MasterImageLinker.tsx (~100 lines)
- Orchestration

---

## 4️⃣ sidebar.tsx (761 lines)

### Current Structure
Complex sidebar with:
- Navigation menu
- User info
- Collapsible sections
- Icons and badges
- Mobile responsive

### Refactoring Plan

**Split into 4 components:**

#### 4.1 SidebarHeader.tsx (~80 lines)
- Logo/branding
- User avatar
- Collapse toggle

#### 4.2 SidebarNavigation.tsx (~400 lines)
- Menu items
- Active states
- Icons

#### 4.3 SidebarFooter.tsx (~100 lines)
- User actions
- Settings link
- Logout

#### 4.4 SidebarSection.tsx (~80 lines)
- Reusable section component
- Collapsible logic

#### 4.5 sidebar.tsx (~100 lines)
- Layout and composition

---

## 5️⃣ EnhancedOrderManagement.tsx (724 lines)

### Refactoring Plan

**Split into 5 components:**

#### 5.1 OrderFilters.tsx (~150 lines)
- Search and filters
- Date range
- Status filters

#### 5.2 OrdersTable.tsx (~250 lines)
- Data table
- Sorting
- Pagination

#### 5.3 OrderActions.tsx (~150 lines)
- Bulk actions
- Status updates
- Export

#### 5.4 OrderDetailModal.tsx (~100 lines)
- Order details view
- (Or use existing OrderDetailModal)

#### 5.5 EnhancedOrderManagement.tsx (~100 lines)
- Orchestration

---

## 6️⃣ EnhancedProductGallery.tsx (717 lines)

### Refactoring Plan

**Split into 3 components:**

#### 6.1 GalleryGrid.tsx (~300 lines)
- Image grid display
- Lightbox integration
- Image selection

#### 6.2 GalleryControls.tsx (~200 lines)
- Upload controls
- Sorting options
- Filter controls
- Bulk actions

#### 6.3 GalleryImageCard.tsx (~150 lines)
- Individual image card
- Actions menu
- Preview

#### 6.4 EnhancedProductGallery.tsx (~100 lines)
- Gallery orchestration
- State management

---

## ✅ Best Practices for Refactoring

### Before Starting
1. **Read the entire component** - Understand all functionality
2. **Create tests** - Add tests for critical paths if missing
3. **Create feature branch** - `refactor/component-name`
4. **Document current behavior** - Screenshots, flow diagrams

### During Refactoring
1. **Extract smallest pieces first** - Preview components, display components
2. **One component at a time** - Don't refactor multiple at once
3. **Keep interfaces stable** - Props should be clear and typed
4. **Test after each extraction** - Ensure functionality preserved
5. **Use TypeScript strictly** - No `any` types

### After Refactoring
1. **Manual testing** - Test all user flows
2. **Performance check** - No performance degradation
3. **Code review** - Have another dev review
4. **Update documentation** - Mark as completed
5. **Monitor production** - Watch for errors after deployment

---

## 📋 Refactoring Checklist Template

Use this for each component:

```markdown
## [Component Name] Refactoring

### Pre-Refactoring
- [ ] Read entire component
- [ ] Document all functionality
- [ ] Take screenshots of all states
- [ ] Create test cases (if missing)
- [ ] Create feature branch
- [ ] Identify breaking change risks

### Refactoring Steps
- [ ] Extract Component 1: [Name]
- [ ] Test Component 1
- [ ] Extract Component 2: [Name]
- [ ] Test Component 2
- [ ] Extract Component 3: [Name]
- [ ] Test Component 3
- [ ] Simplify main component
- [ ] Test integration

### Post-Refactoring
- [ ] All original functionality works
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Props are well-typed
- [ ] Components documented
- [ ] Performance is same or better
- [ ] Code review completed
- [ ] Merged to main
- [ ] Monitored in production

### Metrics
- Lines before: ___
- Lines after: ___
- Components created: ___
- Time spent: ___ hours
```

---

## 🎯 Implementation Priority

### Phase 1 (Start here)
1. **PromotionalBannersManagement.tsx** - Most straightforward
2. **sidebar.tsx** - Clear separation of concerns

### Phase 2
3. **EnhancedOrderManagement.tsx** - Good ROI
4. **EnhancedProductGallery.tsx** - Gallery logic is isolatable

### Phase 3 (Most complex)
5. **ManualImageLinker.tsx** - Complex state management
6. **MasterImageLinker.tsx** - AI logic requires careful handling

---

## 📈 Expected Benefits

After completing all refactoring:

- **Maintainability:** 80% easier to modify components
- **Testability:** 90% easier to write tests
- **Onboarding:** New devs understand code 3x faster
- **Bug fixes:** 50% faster to locate and fix issues
- **Reusability:** Components can be reused elsewhere
- **Bundle size:** Potential 5-10% reduction with code splitting

---

## 🚨 Warnings

### High-Risk Areas
- Image linking logic (ManualImageLinker, MasterImageLinker)
- Order state management (EnhancedOrderManagement)
- Banner live preview (PromotionalBannersManagement)

### Don't Refactor If:
- No tests exist and you can't create them
- Component works and rarely needs changes
- Tight deadline approaching
- You don't fully understand the component

### When to Stop
- If refactoring introduces bugs
- If it takes > 2x estimated time
- If tests start failing frequently
- If you're creating more complexity

---

## 📚 Resources

- [React Component Composition](https://react.dev/learn/passing-props-to-a-component)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [Component Size Guidelines](https://kentcdodds.com/blog/write-fewer-longer-tests)

---

**Ready to start? Pick Phase 1, Component 1 (PromotionalBannersManagement) and follow the checklist!**
