-- Create delivery_zones table for managing delivery fees
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  min_order_value NUMERIC DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  free_delivery_threshold NUMERIC,
  estimated_days_min INTEGER DEFAULT 1,
  estimated_days_max INTEGER DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active delivery zones" 
ON public.delivery_zones 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Superadmins can manage delivery zones" 
ON public.delivery_zones 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_zones_updated_at
BEFORE UPDATE ON public.delivery_zones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default delivery zones
INSERT INTO public.delivery_zones (name, description, delivery_fee, free_delivery_threshold, estimated_days_min, estimated_days_max) VALUES
('Local Delivery', 'Same city delivery', 50.00, 1000.00, 1, 2),
('National Delivery', 'Nationwide delivery via courier', 150.00, 1500.00, 3, 5),
('Express Delivery', 'Next day delivery (major cities)', 250.00, NULL, 1, 1);