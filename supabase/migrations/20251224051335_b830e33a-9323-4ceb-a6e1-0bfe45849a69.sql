-- Fix 1: Update pending_orders expiration to 48 hours
ALTER TABLE public.pending_orders
ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '48 hours');

-- Fix 2: Drop and recreate payment_logs with correct schema
DROP TABLE IF EXISTS public.payment_logs CASCADE;

CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  transaction_id UUID REFERENCES public.payment_transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view payment logs"
ON public.payment_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Service role can insert payment logs"
ON public.payment_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_payment_logs_event_type ON public.payment_logs(event_type);
CREATE INDEX idx_payment_logs_created_at ON public.payment_logs(created_at DESC);
CREATE INDEX idx_payment_logs_metadata ON public.payment_logs USING GIN(metadata);