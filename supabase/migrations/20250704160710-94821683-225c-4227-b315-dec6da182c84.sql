-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add brand_id to products table
ALTER TABLE public.products ADD COLUMN brand_id UUID REFERENCES public.brands(id);

-- Enable RLS on brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brands
CREATE POLICY "Anyone can view active brands" 
ON public.brands 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage brands" 
ON public.brands 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Insert the brands from your list
INSERT INTO public.brands (name, slug, is_active, sort_order) VALUES
('Herevin', 'herevin', true, 1),
('Luminarc', 'luminarc', true, 2),
('Citinova', 'citinova', true, 3),
('Otima', 'otima', true, 4),
('Ikhaya Homeware', 'ikhaya-homeware', true, 5),
('Cadac', 'cadac', true, 6),
('Addis', 'addis', true, 7),
('Maxim', 'maxim', true, 8),
('Rubynova', 'rubynova', true, 9),
('Bon Voyage', 'bon-voyage', true, 10),
('Hendler & Hart', 'hendler-hart', true, 11),
('Kango', 'kango', true, 12),
('Pearl', 'pearl', true, 13);

-- Insert/update the categories from your list
INSERT INTO public.categories (name, slug, is_active, sort_order) VALUES
('Glassware', 'glassware', true, 1),
('Stoneware', 'stoneware', true, 2),
('Catering', 'catering', true, 3),
('Cuttlery', 'cuttlery', true, 4),
('Kitchenware', 'kitchenware', true, 5),
('Bakeware', 'bakeware', true, 6),
('Plasticware', 'plasticware', true, 7),
('Packaging & Gifting', 'packaging-gifting', true, 8),
('Toys', 'toys', true, 9),
('Pots & Pans', 'pots-pans', true, 10),
('Outdoor', 'outdoor', true, 11),
('Hardware', 'hardware', true, 12),
('Electrical', 'electrical', true, 13),
('Appliances', 'appliances', true, 14),
('Brushware', 'brushware', true, 15)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;