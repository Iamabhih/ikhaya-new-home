-- Add manager permissions for key tables they need access to

-- Drop and recreate policies for products
DROP POLICY IF EXISTS "Managers can view products" ON public.products;
CREATE POLICY "Managers can view products" 
ON public.products 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Drop and recreate policies for categories  
DROP POLICY IF EXISTS "Managers can view categories" ON public.categories;
CREATE POLICY "Managers can view categories" 
ON public.categories 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Drop and recreate policies for product images
DROP POLICY IF EXISTS "Managers can view product images" ON public.product_images;
CREATE POLICY "Managers can view product images" 
ON public.product_images 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));