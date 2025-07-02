-- Create homepage settings tables for manual control of featured sections

-- Table for featured categories on homepage
CREATE TABLE public.homepage_featured_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

-- Table for featured products on homepage  
CREATE TABLE public.homepage_featured_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS on both tables
ALTER TABLE public.homepage_featured_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_featured_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for homepage_featured_categories
CREATE POLICY "Anyone can view active featured categories"
ON public.homepage_featured_categories
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage featured categories"
ON public.homepage_featured_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- RLS policies for homepage_featured_products
CREATE POLICY "Anyone can view active featured products"
ON public.homepage_featured_products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage featured products"
ON public.homepage_featured_products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_homepage_featured_categories_display_order ON public.homepage_featured_categories(display_order);
CREATE INDEX idx_homepage_featured_products_display_order ON public.homepage_featured_products(display_order);
CREATE INDEX idx_homepage_featured_categories_active ON public.homepage_featured_categories(is_active);
CREATE INDEX idx_homepage_featured_products_active ON public.homepage_featured_products(is_active);