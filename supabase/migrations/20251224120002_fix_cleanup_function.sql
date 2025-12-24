-- Fix cleanup_expired_pending_orders function
-- This addresses CRITICAL issue #6: Pending order expiration mismatch
--
-- Problem: Function hardcodes 2 hours but expires_at column uses 48 hours
-- Solution: Use expires_at column instead of hardcoded interval
--
-- Created: 2025-12-24
-- Issue: AUDIT_REPORT.md #5

CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete pending orders that have expired based on expires_at column
  -- This respects the 48-hour expiration set in the table default
  DELETE FROM public.pending_orders
  WHERE expires_at < now();

  -- Log the cleanup for monitoring
  RAISE NOTICE 'Cleaned up expired pending orders at %', now();
END;
$$;

-- Update comment to reflect correct expiration
COMMENT ON FUNCTION public.cleanup_expired_pending_orders IS
'Deletes pending orders that have passed their expiration time (default 48 hours from creation). Should be run hourly via cron job.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_orders TO service_role;

---
-- OPTIONAL: Schedule as cron job (requires pg_cron extension)
-- Uncomment if pg_cron is installed
---

-- SELECT cron.schedule(
--   'cleanup-pending-orders',          -- Job name
--   '0 * * * *',                        -- Every hour at minute 0
--   $$SELECT cleanup_expired_pending_orders()$$
-- );

-- To check if cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-pending-orders';

-- To unschedule:
-- SELECT cron.unschedule('cleanup-pending-orders');
