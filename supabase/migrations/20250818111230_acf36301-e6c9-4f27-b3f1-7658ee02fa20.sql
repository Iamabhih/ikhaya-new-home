-- Fix critical security vulnerabilities by adding proper RLS policies

-- 1. Fix newsletter_subscriptions table - restrict public access
CREATE POLICY "Only admins can view all newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- 2. Create missing customer_analytics view with proper security
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

-- Add RLS policy for customer_analytics
ALTER VIEW public.customer_analytics SET (security_invoker = true);

-- Enable RLS on the view (this will be inherited from the underlying tables)
-- Views automatically inherit RLS from their constituent tables when security_invoker is set

-- 3. Create missing product_performance view with proper security
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

-- Set security invoker for product_performance
ALTER VIEW public.product_performance SET (security_invoker = true);