-- Fix cleanup_expired_pending_orders to use expires_at column instead of hardcoded interval

CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete pending orders that have passed their expiration time
  DELETE FROM public.pending_orders 
  WHERE expires_at < now();
END;
$$;