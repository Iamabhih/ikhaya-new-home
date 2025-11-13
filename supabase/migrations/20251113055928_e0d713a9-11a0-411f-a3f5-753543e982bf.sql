-- Add wholesale role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'wholesale';

-- Create quotes table for wholesale customers
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  admin_notes TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create quote_items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_id ON public.quote_items(product_id);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Users can view their own quotes"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Wholesale users can create quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    (has_role(auth.uid(), 'wholesale') OR has_role(auth.uid(), 'customer'))
  );

CREATE POLICY "Users can update their pending quotes"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all quotes"
  ON public.quotes FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can update all quotes"
  ON public.quotes FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- RLS Policies for quote_items
CREATE POLICY "Users can view items in their quotes"
  ON public.quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items in their quotes"
  ON public.quote_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
    AND quotes.status = 'pending'
  ));

CREATE POLICY "Admins can manage all quote items"
  ON public.quote_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));

-- Insert site setting for pricing visibility (jsonb format)
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES (
  'hide_pricing',
  'false'::jsonb,
  'Hide all product pricing from customer-facing views'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 3) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.quotes
  WHERE quote_number ~ '^Q\d+$';
  
  new_number := 'Q' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate quote number
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();