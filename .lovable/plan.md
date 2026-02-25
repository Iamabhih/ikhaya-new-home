
# Fix Build Error — Invalid Tailwind Classes in premium.css

## Root Cause

The build fails because `src/styles/premium.css` uses three Tailwind classes that don't exist:

1. **Line 17**: `bg-background/82` — Tailwind only supports opacity values in increments of 5 (e.g., `/80`, `/85`) or arbitrary values with bracket syntax (`/[0.82]`). `/82` is not valid.
2. **Line 17**: `shadow-glass` — This shadow is not defined in `tailwind.config.ts`. The config has `glow`, `glow-secondary`, `premium`, `card`, but no `glass`.
3. **Line 196**: `bg-primary/8` — Same issue. `/8` is not a valid Tailwind opacity. Should be `/5` or `/10`.

## Fix

| File | Line | Change |
|---|---|---|
| `src/styles/premium.css` | 17 | Replace `@apply bg-background/82 border border-border/20 shadow-glass` with `@apply bg-background/80 border border-border/20 shadow-sm` |
| `src/styles/premium.css` | 196 | Replace `bg-primary/8` with `bg-primary/10` |

These are minimal, safe substitutions:
- `bg-background/80` is the closest valid opacity to 82
- `shadow-sm` provides a subtle shadow similar to what `shadow-glass` would do
- `bg-primary/10` is the closest valid opacity to 8

No other files change. No functionality impact — these are purely CSS utility class corrections.
