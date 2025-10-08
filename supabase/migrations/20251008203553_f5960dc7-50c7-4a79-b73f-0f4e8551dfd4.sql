-- Fix Critical Analytics Timeout Issues

-- Step 1: Add critical missing indexes for query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at_desc ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event ON analytics_events(user_id, event_type, created_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_status ON orders(created_at DESC, status) WHERE status IN ('processing', 'shipped', 'delivered', 'completed');
CREATE INDEX IF NOT EXISTS idx_orders_number_created ON orders(order_number, created_at);

-- Step 2: Create materialized view for daily metrics (pre-aggregated data)
DROP MATERIALIZED VIEW IF EXISTS daily_metrics_cache CASCADE;

CREATE MATERIALIZED VIEW daily_metrics_cache AS
SELECT 
  DATE_TRUNC('day', ae.created_at) as metric_date,
  COUNT(*) FILTER (WHERE ae.event_type = 'page_view' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as page_views,
  COUNT(*) FILTER (WHERE ae.event_type = 'cart' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as cart_events,
  COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'page_view') as unique_sessions
FROM analytics_events ae
WHERE ae.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', ae.created_at);

CREATE INDEX idx_daily_metrics_cache_date ON daily_metrics_cache(metric_date DESC);

-- Step 3: Optimize get_daily_metrics function to use cached data + live orders
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
SET statement_timeout = '10s'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(dmc.metric_date, 'YYYY-MM-DD') as date,
    COALESCE(dmc.page_views, 0) as page_views,
    COALESCE(dmc.cart_events, 0) as cart_events,
    COUNT(DISTINCT o.id) as orders,
    COALESCE(SUM(o.total_amount), 0) as revenue
  FROM daily_metrics_cache dmc
  LEFT JOIN orders o ON DATE_TRUNC('day', o.created_at) = dmc.metric_date
    AND o.created_at BETWEEN start_date AND end_date
    AND o.status IN ('processing', 'shipped', 'delivered', 'completed')
  WHERE dmc.metric_date BETWEEN DATE_TRUNC('day', start_date) AND DATE_TRUNC('day', end_date)
  GROUP BY dmc.metric_date, dmc.page_views, dmc.cart_events
  ORDER BY dmc.metric_date;
END;
$$;

-- Step 4: Fix update_cart_session_metrics trigger to handle missing cart_session_id field
DROP TRIGGER IF EXISTS update_cart_metrics_trigger ON enhanced_cart_tracking;
DROP TRIGGER IF EXISTS update_cart_session_metrics_trigger ON cart_sessions;

CREATE OR REPLACE FUNCTION update_cart_session_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process enhanced_cart_tracking table operations
  IF TG_TABLE_NAME = 'enhanced_cart_tracking' THEN
    IF TG_OP = 'INSERT' AND NEW.cart_session_id IS NOT NULL THEN
      UPDATE cart_sessions 
      SET 
        item_count = (
          SELECT COUNT(*) 
          FROM enhanced_cart_tracking 
          WHERE cart_session_id = NEW.cart_session_id AND removed_at IS NULL
        ),
        total_value = (
          SELECT COALESCE(SUM(product_price * quantity), 0) 
          FROM enhanced_cart_tracking 
          WHERE cart_session_id = NEW.cart_session_id AND removed_at IS NULL
        ),
        updated_at = now()
      WHERE id = NEW.cart_session_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.cart_session_id IS NOT NULL THEN
      UPDATE cart_sessions 
      SET 
        item_count = (
          SELECT COUNT(*) 
          FROM enhanced_cart_tracking 
          WHERE cart_session_id = OLD.cart_session_id AND removed_at IS NULL
        ),
        total_value = (
          SELECT COALESCE(SUM(product_price * quantity), 0) 
          FROM enhanced_cart_tracking 
          WHERE cart_session_id = OLD.cart_session_id AND removed_at IS NULL
        ),
        updated_at = now()
      WHERE id = OLD.cart_session_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger with correct scope
CREATE TRIGGER update_cart_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON enhanced_cart_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_session_metrics();

-- Step 5: Update refresh_analytics_views to include daily metrics cache
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY clean_customer_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY clean_product_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_cache;
END;
$$;

-- Step 6: Create indexes on materialized views for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_clean_customer_analytics_id ON clean_customer_analytics(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clean_product_performance_id ON clean_product_performance(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_metrics_cache_unique ON daily_metrics_cache(metric_date);