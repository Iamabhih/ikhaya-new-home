-- Extend pending_orders expiration from 2 hours to 48 hours
-- This prevents PayFast webhook delays from causing order creation failures

-- Update the default expiration time for new pending orders
ALTER TABLE public.pending_orders
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '48 hours');

-- Update existing pending orders that haven't expired yet
-- Extend their expiration time to 48 hours from their creation time
UPDATE public.pending_orders
SET expires_at = created_at + INTERVAL '48 hours'
WHERE expires_at > now();

-- Add comment explaining the change
COMMENT ON COLUMN public.pending_orders.expires_at IS 'Order expires 48 hours after creation to account for PayFast webhook delays';
