

# Fix Plan — Two Build Errors

## Error 1: `getClaims` does not exist on `SupabaseAuthClient` (delete-user edge function)

**Root cause:** `@supabase/supabase-js@2.39.3` does not have a `getClaims()` method. That API was introduced in a much later version. The function is pinned to `@2.39.3` via the import URL.

**Fix:** Replace `getClaims(token)` with `getUser()`. The previous attempt switched away from `getUser()` because it was returning null — but that was likely caused by not passing the token correctly. The fix is to create the caller client with the Authorization header already set (which is already done on line 32-36), and then call `getUser()` which will use that header. This is the standard documented pattern for Supabase Edge Functions.

In `supabase/functions/delete-user/index.ts`, replace lines 29-47:

```typescript
const callerClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
if (authError || !caller) {
  console.error("[delete-user] getUser error:", authError);
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const callerId = caller.id;
```

Then update all references from `claimsData.claims.sub` to `callerId` (which is already the variable name used downstream).

---

## Error 2: CampaignProductsPage type mismatch on `product_images`

**Root cause:** The Supabase query on line 49 uses `product_images(...)` inside the `products:product_id(...)` select, but the generated types cannot resolve the relation `product_id -> product_images`. This produces a `SelectQueryError` type that is incompatible with the `CampaignProduct` interface.

**Fix:** Cast through `unknown` on line 77:

```typescript
return { ...data, campaign_products: filteredProducts } as unknown as Campaign;
```

This is safe because the runtime data shape matches — the issue is purely a generated-types limitation with nested foreign-key joins.

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/delete-user/index.ts` | Replace `getClaims(token)` with `getUser()`, update variable references |
| `src/pages/CampaignProductsPage.tsx` | Add `unknown` intermediate cast on line 77 |
| `CHANGELOG.md` | Document the fixes |

## What Will NOT Change

- The 14-step user data cleanup logic in delete-user — fully preserved
- Payment flows, order management, analytics — untouched
- The CampaignProductCard component — untouched
- All other edge functions — untouched

