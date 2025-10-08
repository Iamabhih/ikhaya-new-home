-- Phase 1: Fix Database Views & Functions

-- Use DO block to handle different view types
DO $$
BEGIN
  -- Try dropping as regular view first, then as materialized view
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS clean_customer_analytics CASCADE';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS clean_customer_analytics CASCADE';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    EXECUTE 'DROP VIEW IF EXISTS clean_product_performance CASCADE';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS clean_product_performance CASCADE';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Create clean_customer_analytics as MATERIALIZED VIEW with corrected logic
CREATE MATERIALIZED VIEW clean_customer_analytics AS
SELECT 
  p.id,
  p.id as user_id,
  p.email,
  COALESCE(p.first_name || ' ' || p.last_name, p.email) as display_name,
  p.created_at as registration_date,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) as total_orders,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')), 0) as total_spent,
  CASE 
    WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) > 0 
    THEN ROUND(
      (SUM(o.total_amount) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) / 
       NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')), 0))::numeric, 
      2
    )
    ELSE 0 
  END as avg_order_value,
  MAX(o.created_at) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) as last_order_date,
  CASE 
    WHEN SUM(o.total_amount) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) > 5000 THEN 'VIP'
    WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) >= 5 THEN 'Loyal'
    WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) >= 2 THEN 'Regular'
    WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')) = 1 THEN 'New'
    ELSE 'Prospect'
  END as customer_segment
FROM profiles p
LEFT JOIN orders o ON p.id = o.user_id
WHERE is_authentic_user(p.id) = TRUE
GROUP BY p.id, p.email, p.first_name, p.last_name, p.created_at;

-- Create clean_product_performance as MATERIALIZED VIEW
CREATE MATERIALIZED VIEW clean_product_performance AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(SUM(oi.total_price), 0) as total_revenue,
  COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'product_view') as total_views,
  CASE 
    WHEN COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'product_view') > 0 
    THEN ROUND(
      (COUNT(DISTINCT o.id)::numeric / 
       NULLIF(COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'product_view'), 0)) * 100, 
      2
    )
    ELSE 0 
  END as conversion_rate
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('processing', 'shipped', 'delivered', 'completed')
LEFT JOIN analytics_events ae ON p.id = ae.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.sku;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_type ON analytics_events(created_at, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_type ON analytics_events(product_id, event_type);
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_id, status, created_at);

-- Create function for daily metrics
CREATE OR REPLACE FUNCTION get_daily_metrics(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE(
  date TEXT,
  page_views BIGINT,
  cart_events BIGINT,
  orders BIGINT,
  revenue NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('day', ae.created_at), 'YYYY-MM-DD') as date,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view') as page_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'cart') as cart_events,
    COUNT(DISTINCT o.id) as orders,
    COALESCE(SUM(o.total_amount), 0) as revenue
  FROM analytics_events ae
  LEFT JOIN orders o ON ae.session_id = o.order_number 
    AND o.created_at BETWEEN start_date AND end_date
    AND o.status IN ('processing', 'shipped', 'delivered', 'completed')
  WHERE ae.created_at BETWEEN start_date AND end_date
    AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)
  GROUP BY DATE_TRUNC('day', ae.created_at)
  ORDER BY DATE_TRUNC('day', ae.created_at);
END;
$$;

-- Update refresh function
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW clean_customer_analytics;
  REFRESH MATERIALIZED VIEW clean_product_performance;
END;
$$;