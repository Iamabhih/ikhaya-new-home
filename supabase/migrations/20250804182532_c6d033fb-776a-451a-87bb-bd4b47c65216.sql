-- Create payment settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  is_test_mode BOOLEAN DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(gateway_name)
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage payment settings
CREATE POLICY "Only superadmins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default PayFast settings
INSERT INTO public.payment_settings (gateway_name, is_enabled, is_test_mode, settings)
VALUES (
  'payfast',
  true,
  true,
  '{
    "merchant_id": "",
    "merchant_key": "",
    "passphrase": ""
  }'::jsonb
) ON CONFLICT (gateway_name) DO NOTHING;