-- Remove newsletter policy that conflicts and recreate views properly
DROP POLICY IF EXISTS "Only admins can view all newsletter subscriptions" ON public.newsletter_subscriptions;

-- Fix newsletter_subscriptions table - only allow public insertion, admin viewing
-- Remove the current overly permissive policy and add proper restrictions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.newsletter_subscriptions;

-- Only allow admins to read newsletter subscriptions (contains sensitive data)
CREATE POLICY "Admins can manage newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow public subscription (newsletter signup)
CREATE POLICY "Public can subscribe to newsletter" 
ON public.newsletter_subscriptions 
FOR INSERT 
WITH CHECK (true);

-- Fix customer_analytics and product_performance views to use security_invoker
-- This ensures they inherit RLS from underlying tables
DROP VIEW IF EXISTS public.customer_analytics;
CREATE VIEW public.customer_analytics 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at as registration_date,
  COALESCE(o.total_orders, 0) as total_orders,
  COALESCE(o.total_spent, 0) as total_spent,
  COALESCE(o.avg_order_value, 0) as avg_order_value,
  o.last_order_date,
  CASE 
    WHEN o.last_order_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (now() - o.last_order_date))
    ELSE NULL 
  END as days_since_last_order
FROM public.profiles p
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_order_value,
    MAX(created_at) as last_order_date
  FROM public.orders 
  WHERE status = 'delivered'
  GROUP BY user_id
) o ON p.id = o.user_id;

DROP VIEW IF EXISTS public.product_performance;
CREATE VIEW public.product_performance 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.name,
  p.category_id,
  c.name as category_name,
  p.price,
  p.stock_quantity,
  COALESCE(p.average_rating, 0) as avg_rating,
  COALESCE(p.review_count, 0) as review_count,
  COALESCE(oi.order_count, 0) as order_count,
  COALESCE(oi.total_sold, 0) as total_sold,
  COALESCE(oi.total_revenue, 0) as total_revenue
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN (
  SELECT 
    product_id,
    COUNT(DISTINCT order_id) as order_count,
    SUM(quantity) as total_sold,
    SUM(total_price) as total_revenue
  FROM public.order_items oi
  JOIN public.orders o ON oi.order_id = o.id
  WHERE o.status = 'delivered'
  GROUP BY product_id
) oi ON p.id = oi.product_id
WHERE p.is_active = true;