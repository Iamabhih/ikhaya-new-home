-- Add missing columns to orders table for order processing
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_info jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_data jsonb;

-- Drop and recreate payment_logs table with the correct schema expected by edge functions
DROP TABLE IF EXISTS public.payment_logs CASCADE;

CREATE TABLE public.payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id text,
  m_payment_id text,
  pf_payment_id text,
  payment_status text,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  error_details jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_logs
CREATE POLICY "Admins can view payment logs"
ON public.payment_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Service role can insert payment logs"
ON public.payment_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Managers can view payment logs"
ON public.payment_logs
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));