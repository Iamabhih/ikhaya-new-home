
-- Clean up empty categories that have no products
DELETE FROM public.categories 
WHERE id IN (
  SELECT c.id 
  FROM public.categories c 
  LEFT JOIN public.products p ON c.id = p.category_id 
  WHERE p.id IS NULL
);

-- Update category slugs to ensure consistency
UPDATE public.categories 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Add missing payment methods with valid enum values only
INSERT INTO public.payment_methods (name, type, description, is_active, sort_order) VALUES
('Credit/Debit Card', 'payfast', 'Pay securely with your credit or debit card via PayFast', true, 1),
('EFT Payment', 'eft', 'Electronic Funds Transfer payment', true, 2),
('PayFlex Buy Now Pay Later', 'payflex', 'Buy now, pay later with PayFlex', true, 3)
ON CONFLICT DO NOTHING;

-- Ensure all products have proper slugs
UPDATE public.products 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured_active ON public.products(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories(is_active, sort_order);
