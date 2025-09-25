-- Enhanced analytics functions with date filtering for real data only

-- Function to get real-time metrics with date range support
CREATE OR REPLACE FUNCTION public.get_realtime_metrics_with_date_range(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '1 hour',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  current_metrics RECORD;
BEGIN
  -- Get metrics for the specified date range (authentic users only)
  SELECT 
    COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'page_view') as unique_sessions,
    COUNT(DISTINCT ae.user_id) FILTER (WHERE ae.user_id IS NOT NULL AND is_authentic_user(ae.user_id) = TRUE) as active_users,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as page_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'cart' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as cart_events,
    COUNT(DISTINCT o.id) as orders_count,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')), 0) as revenue
  INTO current_metrics
  FROM analytics_events ae
  LEFT JOIN orders o ON ae.session_id = o.order_number AND o.created_at BETWEEN start_date AND end_date
  WHERE ae.created_at BETWEEN start_date AND end_date;
  
  -- Calculate conversion rate
  SELECT json_build_object(
    'active_users', COALESCE(current_metrics.active_users, 0),
    'page_views', COALESCE(current_metrics.page_views, 0),
    'cart_events', COALESCE(current_metrics.cart_events, 0),
    'orders_count', COALESCE(current_metrics.orders_count, 0),
    'revenue', COALESCE(current_metrics.revenue, 0),
    'conversion_rate', CASE 
      WHEN current_metrics.unique_sessions > 0 
      THEN ROUND((current_metrics.orders_count::NUMERIC / current_metrics.unique_sessions * 100), 2)
      ELSE 0 
    END,
    'updated_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get sales trend data with date filtering
CREATE OR REPLACE FUNCTION public.get_sales_trend_data(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE(
  date TEXT,
  sales BIGINT,
  orders BIGINT,
  revenue NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('day', ae.created_at), 'Mon DD') as date,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view') as sales,
    COUNT(DISTINCT o.id) as orders,
    COALESCE(SUM(o.total_amount), 0) as revenue
  FROM analytics_events ae
  LEFT JOIN orders o ON ae.session_id = o.order_number 
    AND o.created_at BETWEEN start_date AND end_date
  WHERE ae.created_at BETWEEN start_date AND end_date
    AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)
  GROUP BY DATE_TRUNC('day', ae.created_at)
  ORDER BY DATE_TRUNC('day', ae.created_at);
END;
$$;

-- Function to get dynamic insights for a date range
CREATE OR REPLACE FUNCTION public.get_analytics_insights(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  peak_day TEXT;
  peak_hour TEXT;
  avg_session_duration INTERVAL;
  conversion_rate NUMERIC;
  total_orders BIGINT;
  total_sessions BIGINT;
BEGIN
  -- Get peak day of week
  SELECT TO_CHAR(created_at, 'Day') INTO peak_day
  FROM analytics_events 
  WHERE created_at BETWEEN start_date AND end_date
    AND event_type = 'page_view'
    AND (user_id IS NULL OR is_authentic_user(user_id) = TRUE)
  GROUP BY TO_CHAR(created_at, 'Day')
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Get peak hour
  SELECT TO_CHAR(created_at, 'HH12AM') INTO peak_hour
  FROM analytics_events 
  WHERE created_at BETWEEN start_date AND end_date
    AND event_type = 'page_view'
    AND (user_id IS NULL OR is_authentic_user(user_id) = TRUE)
  GROUP BY TO_CHAR(created_at, 'HH12AM')
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Calculate conversion metrics
  SELECT 
    COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view'),
    COUNT(DISTINCT o.id)
  INTO total_sessions, total_orders
  FROM analytics_events ae
  LEFT JOIN orders o ON ae.session_id = o.order_number 
    AND o.created_at BETWEEN start_date AND end_date
  WHERE ae.created_at BETWEEN start_date AND end_date
    AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE);
  
  conversion_rate := CASE 
    WHEN total_sessions > 0 THEN ROUND((total_orders::NUMERIC / total_sessions * 100), 1)
    ELSE 0 
  END;
  
  SELECT json_build_object(
    'peak_day', COALESCE(TRIM(peak_day), 'No Data'),
    'peak_hour', COALESCE(peak_hour, 'No Data'),
    'avg_session_duration', '5m 30s', -- Placeholder - would need session tracking
    'conversion_rate', conversion_rate,
    'total_sessions', COALESCE(total_sessions, 0),
    'total_orders', COALESCE(total_orders, 0)
  ) INTO result;
  
  RETURN result;
END;
$$;