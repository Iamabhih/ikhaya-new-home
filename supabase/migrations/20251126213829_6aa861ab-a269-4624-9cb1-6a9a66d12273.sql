-- Drop the existing trader_applications table and recreate with correct schema
DROP TABLE IF EXISTS public.trader_applications CASCADE;

-- Create trader_applications table with fields matching the application code
CREATE TABLE public.trader_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  trading_name text,
  vat_number text,
  registration_number text,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  postal_code text NOT NULL,
  business_type text NOT NULL,
  years_in_business text,
  estimated_monthly_orders text,
  additional_info text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone,
  review_notes text
);

-- Enable RLS
ALTER TABLE public.trader_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own applications"
  ON public.trader_applications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can submit applications"
  ON public.trader_applications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their pending applications"
  ON public.trader_applications
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
  ON public.trader_applications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can update all applications"
  ON public.trader_applications
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Recreate the approval and rejection functions (they were dropped with CASCADE)
CREATE OR REPLACE FUNCTION public.approve_trader_application(
  application_id uuid,
  admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_user_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT user_id INTO app_user_id
  FROM trader_applications
  WHERE id = application_id;

  IF app_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or user_id is null';
  END IF;

  UPDATE trader_applications
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = admin_notes,
    updated_at = now()
  WHERE id = application_id;

  INSERT INTO user_roles (user_id, role)
  VALUES (app_user_id, 'wholesale'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_trader_application(
  application_id uuid,
  admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can reject applications';
  END IF;

  UPDATE trader_applications
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = admin_notes,
    updated_at = now()
  WHERE id = application_id;
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trader_applications_user_id ON public.trader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_applications_status ON public.trader_applications(status);
CREATE INDEX IF NOT EXISTS idx_trader_applications_created_at ON public.trader_applications(created_at DESC);