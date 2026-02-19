-- Fix FK constraints that block auth.users deletion for admin/superadmin users.
--
-- Two tables were missing ON DELETE rules, causing auth.admin.deleteUser() to
-- fail with a foreign-key constraint violation whenever a user had rows in
-- these tables:
--
--   product_imports  – user_id UUID REFERENCES auth.users NOT NULL
--                      (default NO ACTION = RESTRICT)
--   security_audit_log – user_id uuid REFERENCES auth.users(id)
--                         (default NO ACTION = RESTRICT)
--
-- Fix: give each FK an appropriate ON DELETE behaviour and explicitly delete /
-- nullify the rows in the delete-user edge function before calling deleteUser().

-- 1. product_imports: cascade-delete import records when the user is removed
--    (import jobs belong to the user who triggered them; no reason to keep them)
ALTER TABLE public.product_imports
  DROP CONSTRAINT IF EXISTS product_imports_user_id_fkey;

ALTER TABLE public.product_imports
  ADD CONSTRAINT product_imports_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. security_audit_log: preserve audit log entries but nullify the user link
--    (logs are compliance records and must outlive the user account)
ALTER TABLE public.security_audit_log
  DROP CONSTRAINT IF EXISTS security_audit_log_user_id_fkey;

ALTER TABLE public.security_audit_log
  ADD CONSTRAINT security_audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE SET NULL;
