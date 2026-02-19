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
  -- Admin/superadmin gate
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  -- Load the application record
  SELECT * INTO app_record FROM trader_applications WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Try to resolve a user account:
  -- 1. Use the user_id on the application if present
  -- 2. Fall back to email lookup in profiles (covers guest submissions)
  resolved_user_id := app_record.user_id;
  IF resolved_user_id IS NULL THEN
    SELECT id INTO resolved_user_id
    FROM profiles
    WHERE email = app_record.email
    LIMIT 1;
  END IF;

  -- Mark the application as approved regardless of whether we found a user account
  UPDATE trader_applications
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = admin_notes,
    updated_at = now()
  WHERE id = application_id;

  -- Only assign the wholesale role if we resolved a user account
  IF resolved_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (resolved_user_id, 'wholesale'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;