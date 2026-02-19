
# Trader Application Approval — Full Root Cause Audit

## What Was Found

### Problem 1 — The `approve_trader_application` DB function is WRONG (the currently active version)

The **currently live DB function** (shown in the `<supabase-info>` context) is a DIFFERENT, BROKEN version from what the migration file shows. The live version is:

```sql
SELECT user_id INTO app_user_id
FROM trader_applications
WHERE id = application_id;

IF app_user_id IS NULL THEN
  RAISE EXCEPTION 'Application not found or user_id is null';
END IF;
```

This version **hard-fails if `user_id` is null**. But there is only ONE application in the database, and its `user_id` IS null — because the person who submitted the form was **not logged in** (or the form allowed guest submission, which it does: `user_id: user?.id || null`).

The ORIGINAL migration had the correct logic:
```sql
-- If user_id exists, update their profile and assign wholesale role
IF app_record.user_id IS NOT NULL THEN
  -- only then assign role
END IF;
```

Somewhere after the initial migration, the function was overwritten with a bad version that requires `user_id` to never be null — but the table design and form both explicitly allow null `user_id` for guest/unauthenticated applicants.

### Problem 2 — Guest applications can never be approved (design gap)

Even if the function didn't hard-fail, a guest application with `user_id = NULL` cannot have a wholesale role assigned — because `user_roles` requires a `user_id`. The current flow has **no way to link a guest application to an actual account**.

The correct solution: when approving an application where `user_id IS NULL`, look up the `profiles` table by **email** to find if a matching account exists, and use that. If no account exists, mark the application as approved without assigning a role (and optionally show an admin warning).

### Problem 3 — The form allows unauthenticated/guest submissions that are then unactionable

The `TraderApplicationForm` submits with `user_id: user?.id || null`. The form is accessible to guests, but there's nothing preventing submissions that cannot be actioned. This is a UX and data quality issue.

---

## Confirmed Data State

- **1 application in DB**: `E Concepts ZA PTY LTD` — `user_id: null`, `status: pending`
- **No matching profile** found for `exceptionlconceptsza@gmail.com` — so there is no account to link to even with email lookup
- The `app_role` enum has: `customer`, `wholesale`, `admin`, `superadmin`, `manager`

---

## The Fix — 3 Parts

### Fix 1 — Rewrite `approve_trader_application` DB function (migration)

Replace the broken live function with one that:
1. Does NOT hard-fail when `user_id IS NULL`
2. Tries email-based lookup if `user_id IS NULL` (finds profile by application email)
3. Marks the application approved regardless
4. Only assigns the wholesale role if a user account is found (by `user_id` or by email)
5. Returns useful info about what happened

```sql
CREATE OR REPLACE FUNCTION public.approve_trader_application(
  application_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record RECORD;
  resolved_user_id UUID;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO app_record FROM trader_applications WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Try to resolve user: first by user_id, then by email lookup
  resolved_user_id := app_record.user_id;
  IF resolved_user_id IS NULL THEN
    SELECT id INTO resolved_user_id FROM profiles WHERE email = app_record.email LIMIT 1;
  END IF;

  UPDATE trader_applications
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = admin_notes,
    updated_at = now()
  WHERE id = application_id;

  -- Only assign role if we found a user account
  IF resolved_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (resolved_user_id, 'wholesale'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
```

### Fix 2 — Update `TraderApplications.tsx` to show a warning for null user_id applications

When displaying applications with `user_id = null`, show an informational badge so admins understand approving will not auto-assign a role (the applicant needs to create an account first). This is purely a UI improvement — no DB changes needed.

Add:
- A "No Account" badge on the row and detail view when `user_id` is null
- An informational note in the approval dialog: "This applicant has no linked account. Approving will mark the application as approved, but the wholesale role cannot be assigned until they sign up with the email: `[email]`"
- The approve button still works — it approves the application status

### Fix 3 — Update CHANGELOG.md

Document what was found and fixed.

---

## Files to Modify

| File | Change |
|---|---|
| Database (migration) | Rewrite `approve_trader_application` to handle null `user_id` gracefully with email fallback |
| `src/components/admin/TraderApplications.tsx` | Show "No Account" badge for null user_id; add warning in approval dialog |
| `CHANGELOG.md` | Document root cause and fix |

## What Will NOT Change

- The `trader_applications` table schema — it correctly allows null `user_id`
- The `TraderApplicationForm` submission logic — guest applications remain allowed
- The `reject_trader_application` function — it works fine (rejection doesn't need a user account)
- All other admin functionality — untouched
- All payment, order, auth flows — untouched
