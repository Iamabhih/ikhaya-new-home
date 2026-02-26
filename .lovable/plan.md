

# Enable Manager Role for Product Management

## Summary

Currently, users with the `manager` role are completely locked out of product management. Three layers need updating: routing, navigation, and database permissions.

## What's Broken

1. **Route guard**: `/admin/products` uses `<AdminProtectedRoute>` without `allowManager` -- managers get "Access Denied"
2. **Sidebar navigation**: The `managerRoutes` array only includes Dashboard, Orders, Analytics, and Returns -- no Products link
3. **Database RLS**: Managers can only SELECT from `products` and `product_images` -- they cannot insert, update, or delete
4. **Image candidates**: The `product_image_candidates` table has no manager policy at all

## Changes

### 1. Route access (src/App.tsx)
- Add `allowManager` to the `/admin/products` route so managers can access the page

### 2. Sidebar navigation (src/components/admin/AdminSidebar.tsx)
- Add the Products route to `managerRoutes` so managers see the link in the sidebar
- Optionally limit which tabs managers see (e.g., hide "Delete All Products", import scheduler) -- but this can be a follow-up

### 3. Database RLS policies (migration)
Add write policies for the manager role on three tables:

- **`products`**: Allow managers to INSERT, UPDATE, and DELETE
- **`product_images`**: Allow managers to INSERT, UPDATE, and DELETE
- **`product_image_candidates`**: Allow managers full access (ALL)

All policies will use the existing `has_role(auth.uid(), 'manager')` security definer function.

### 4. Changelog update (CHANGELOG.md)
Document the manager product access addition.

## Files to Modify

| File | Change |
|---|---|
| `src/App.tsx` (line 145) | Add `allowManager` to products route |
| `src/components/admin/AdminSidebar.tsx` (line 108-130) | Add Products to `managerRoutes` |
| Database migration | Add manager write RLS policies for `products`, `product_images`, `product_image_candidates` |
| `CHANGELOG.md` | Document manager product management access |

## What Will NOT Change

- Admin/superadmin permissions -- untouched
- Storage bucket policies -- already allow authenticated users
- Product management UI components -- no changes needed, they work for any authorized user
- Delete All Products, import tools -- remain visible (can be restricted later if desired)

## Security Note

The `manager` role will have full product CRUD. This is intentional since managers need to edit products, upload images, and manage inventory. Sensitive operations like user management, payment settings, and system settings remain restricted to superadmin only.

