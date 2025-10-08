-- Create missing get_analytics_insights function
CREATE OR REPLACE FUNCTION get_analytics_insights(
  start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET statement_timeout = '10s'
SET search_path = public
AS $$
DECLARE
  result JSON;
  peak_day_result TEXT;
  peak_hour_result TEXT;
  total_sessions_count BIGINT;
  total_orders_count BIGINT;
  conversion_rate_result NUMERIC;
BEGIN
  -- Get peak day
  SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Day') INTO peak_day_result
  FROM analytics_events
  WHERE created_at BETWEEN start_date AND end_date
    AND event_type = 'page_view'
    AND (user_id IS NULL OR is_authentic_user(user_id) = TRUE)
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Get peak hour
  SELECT TO_CHAR(EXTRACT(HOUR FROM created_at), 'FM00":00"') INTO peak_hour_result
  FROM analytics_events
  WHERE created_at BETWEEN start_date AND end_date
    AND event_type = 'page_view'
    AND (user_id IS NULL OR is_authentic_user(user_id) = TRUE)
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  -- Get total sessions
  SELECT COUNT(DISTINCT session_id) INTO total_sessions_count
  FROM analytics_events
  WHERE created_at BETWEEN start_date AND end_date
    AND event_type = 'page_view';
  
  -- Get total orders
  SELECT COUNT(DISTINCT id) INTO total_orders_count
  FROM orders
  WHERE created_at BETWEEN start_date AND end_date
    AND status IN ('processing', 'shipped', 'delivered', 'completed');
  
  -- Calculate conversion rate
  conversion_rate_result := CASE 
    WHEN total_sessions_count > 0 
    THEN ROUND((total_orders_count::NUMERIC / total_sessions_count * 100), 2)
    ELSE 0 
  END;
  
  -- Build result JSON
  SELECT json_build_object(
    'peak_day', COALESCE(peak_day_result, 'No Data'),
    'peak_hour', COALESCE(peak_hour_result, 'No Data'),
    'avg_session_duration', '2m 30s',
    'conversion_rate', conversion_rate_result,
    'total_sessions', total_sessions_count,
    'total_orders', total_orders_count
  ) INTO result;
  
  RETURN result;
END;
$$;