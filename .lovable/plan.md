

# Reroute /home to Account Suspended Banner

## Summary

Create a new route `/home` that displays a suspended account banner page instead of the regular homepage.

## Changes

1. **Create AccountSuspended page** (`src/pages/AccountSuspended.tsx`)
   - Full-screen banner with "Account suspended" message
   - Professional styling matching the app design
   - No navigation options (page is locked)

2. **Add route in App.tsx**
   - Add `<Route path="/home" element={<AccountSuspended />} />`
   - Import the new page component

## Files to Modify

| File | Change |
|---|---|
| `src/pages/AccountSuspended.tsx` | New page component with suspended banner |
| `src/App.tsx` | Add `/home` route to the new page |

## Technical Details

- The banner will be centered, full-viewport height
- Use the app's existing color scheme (primary/danger colors)
- No navigation header/footer to enforce the suspension message
- Simple, clear messaging

