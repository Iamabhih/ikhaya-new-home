-- Phase 1: Data Quality & Filtering System

-- Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Create function to check if user is authentic (not admin/test)
CREATE OR REPLACE FUNCTION is_authentic_user(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if user is admin or superadmin
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'superadmin', 'manager')
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Return false if user email contains test patterns
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id_param 
    AND (
      email ILIKE '%test%' OR 
      email ILIKE '%admin%' OR 
      email ILIKE '%example.com%' OR
      email ILIKE '%localhost%' OR
      email ILIKE '%demo%'
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create materialized view for clean customer analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS clean_customer_analytics AS
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at as registration_date,
  COALESCE(customer_stats.total_orders, 0)::BIGINT as total_orders,
  COALESCE(customer_stats.total_spent, 0)::NUMERIC as total_spent,
  COALESCE(customer_stats.avg_order_value, 0)::NUMERIC as avg_order_value,
  customer_stats.last_order_date,
  CASE 
    WHEN customer_stats.last_order_date IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (NOW() - customer_stats.last_order_date))::NUMERIC
  END as days_since_last_order
FROM profiles p
LEFT JOIN (
  SELECT 
    o.user_id,
    COUNT(*)::BIGINT as total_orders,
    SUM(o.total_amount)::NUMERIC as total_spent,
    AVG(o.total_amount)::NUMERIC as avg_order_value,
    MAX(o.created_at) as last_order_date
  FROM orders o
  WHERE o.user_id IS NOT NULL
    AND o.status IN ('processing', 'shipped', 'delivered', 'completed')
    AND is_authentic_user(o.user_id) = TRUE
  GROUP BY o.user_id
) customer_stats ON p.id = customer_stats.user_id
WHERE is_authentic_user(p.id) = TRUE;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_clean_customer_analytics_id ON clean_customer_analytics(id);
CREATE INDEX IF NOT EXISTS idx_clean_customer_analytics_total_spent ON clean_customer_analytics(total_spent DESC);

-- Create materialized view for clean product performance
CREATE MATERIALIZED VIEW IF NOT EXISTS clean_product_performance AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.price,
  p.category_id,
  c.name as category_name,
  COALESCE(sales_stats.total_sold, 0)::BIGINT as total_sold,
  COALESCE(sales_stats.total_revenue, 0)::NUMERIC as total_revenue,
  COALESCE(analytics_stats.total_views, 0)::BIGINT as total_views,
  COALESCE(analytics_stats.total_cart_adds, 0)::BIGINT as total_cart_adds,
  CASE 
    WHEN analytics_stats.total_views > 0 
    THEN (sales_stats.total_sold::NUMERIC / analytics_stats.total_views * 100)
    ELSE 0 
  END as conversion_rate
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN (
  SELECT 
    oi.product_id,
    SUM(oi.quantity)::BIGINT as total_sold,
    SUM(oi.total_price)::NUMERIC as total_revenue
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')
    AND (o.user_id IS NULL OR is_authentic_user(o.user_id) = TRUE)
  GROUP BY oi.product_id
) sales_stats ON p.id = sales_stats.product_id
LEFT JOIN (
  SELECT 
    ae.product_id,
    COUNT(CASE WHEN ae.event_type = 'product_view' THEN 1 END)::BIGINT as total_views,
    COUNT(CASE WHEN ae.event_type = 'cart' AND ae.event_name = 'item_added_to_cart' THEN 1 END)::BIGINT as total_cart_adds
  FROM analytics_events ae
  WHERE ae.product_id IS NOT NULL
    AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)
  GROUP BY ae.product_id
) analytics_stats ON p.id = analytics_stats.product_id
WHERE p.is_active = TRUE;

-- Create index on product performance view
CREATE INDEX IF NOT EXISTS idx_clean_product_performance_revenue ON clean_product_performance(total_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_clean_product_performance_views ON clean_product_performance(total_views DESC);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW clean_customer_analytics;
  REFRESH MATERIALIZED VIEW clean_product_performance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for real-time metrics (authentic data only)
CREATE OR REPLACE FUNCTION get_realtime_metrics(hours_back INTEGER DEFAULT 1)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_time TIMESTAMP;
BEGIN
  start_time := NOW() - (hours_back || ' hours')::INTERVAL;
  
  SELECT json_build_object(
    'active_users', (
      SELECT COUNT(DISTINCT ae.user_id)
      FROM analytics_events ae
      WHERE ae.created_at >= start_time
        AND ae.user_id IS NOT NULL
        AND is_authentic_user(ae.user_id) = TRUE
    ),
    'page_views', (
      SELECT COUNT(*)
      FROM analytics_events ae
      WHERE ae.created_at >= start_time
        AND ae.event_type = 'page_view'
        AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)
    ),
    'cart_events', (
      SELECT COUNT(*)
      FROM analytics_events ae
      WHERE ae.created_at >= start_time
        AND ae.event_type = 'cart'
        AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)
    ),
    'orders_count', (
      SELECT COUNT(*)
      FROM orders o
      WHERE o.created_at >= start_time
        AND (o.user_id IS NULL OR is_authentic_user(o.user_id) = TRUE)
    ),
    'revenue', (
      SELECT COALESCE(SUM(o.total_amount), 0)
      FROM orders o
      WHERE o.created_at >= start_time
        AND o.status IN ('processing', 'shipped', 'delivered', 'completed')
        AND (o.user_id IS NULL OR is_authentic_user(o.user_id) = TRUE)
    ),
    'conversion_rate', (
      WITH stats AS (
        SELECT 
          COUNT(DISTINCT CASE WHEN ae.event_type = 'page_view' THEN ae.session_id END) as visitors,
          COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN o.email END) as converters
        FROM analytics_events ae
        LEFT JOIN orders o ON ae.session_id = o.order_number
        WHERE ae.created_at >= start_time
          AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)
      )
      SELECT CASE 
        WHEN visitors > 0 THEN (converters::NUMERIC / visitors * 100)
        ELSE 0 
      END
      FROM stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;