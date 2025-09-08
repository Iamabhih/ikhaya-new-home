-- Add manager permissions for key tables they need access to

-- Managers should be able to view products for order management and analytics
CREATE POLICY IF NOT EXISTS "Managers can view products" 
ON public.products 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers should be able to view categories for analytics
CREATE POLICY IF NOT EXISTS "Managers can view categories" 
ON public.categories 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Managers should be able to view product images for order management
CREATE POLICY IF NOT EXISTS "Managers can view product images" 
ON public.product_images 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Check if customer_analytics view exists and create policy
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_analytics') THEN
        CREATE POLICY IF NOT EXISTS "Managers can view customer analytics" 
        ON public.customer_analytics 
        FOR SELECT
        TO public
        USING (has_role(auth.uid(), 'manager'::app_role));
    END IF;
END
$$;

-- Check if product_performance view exists and create policy  
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_performance') THEN
        CREATE POLICY IF NOT EXISTS "Managers can view product performance" 
        ON public.product_performance 
        FOR SELECT
        TO public
        USING (has_role(auth.uid(), 'manager'::app_role));
    END IF;
END
$$;