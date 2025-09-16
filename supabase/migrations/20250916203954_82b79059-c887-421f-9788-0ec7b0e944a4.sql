-- Fix security warning for the function I just created
DROP FUNCTION IF EXISTS cleanup_expired_pending_orders();

CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pending_orders 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;