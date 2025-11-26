-- Create trader_applications table
CREATE TABLE IF NOT EXISTS public.trader_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  trading_name text,
  vat_number text,
  registration_number text NOT NULL,
  contact_person text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  physical_address text NOT NULL,
  postal_address text,
  business_type text NOT NULL,
  years_in_business integer,
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  account_number text NOT NULL,
  branch_code text NOT NULL,
  tax_clearance_certificate text,
  cipc_registration text,
  proof_of_address text,
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

-- Create function to approve trader application
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
  -- Check if caller is admin
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  -- Get user_id from application
  SELECT user_id INTO app_user_id
  FROM trader_applications
  WHERE id = application_id;

  IF app_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or user_id is null';
  END IF;

  -- Update application status
  UPDATE trader_applications
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_notes = admin_notes,
    updated_at = now()
  WHERE id = application_id;

  -- Assign wholesale role to user if not already assigned
  INSERT INTO user_roles (user_id, role)
  VALUES (app_user_id, 'wholesale'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create function to reject trader application
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
  -- Check if caller is admin
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Only admins can reject applications';
  END IF;

  -- Update application status
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trader_applications_user_id ON public.trader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_applications_status ON public.trader_applications(status);
CREATE INDEX IF NOT EXISTS idx_trader_applications_created_at ON public.trader_applications(created_at DESC);