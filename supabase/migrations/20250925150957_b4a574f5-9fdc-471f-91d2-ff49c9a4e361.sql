-- Enhance the get_realtime_metrics function to be more accurate and efficient
CREATE OR REPLACE FUNCTION public.get_realtime_metrics(hours_back integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  start_time TIMESTAMP;
  previous_start_time TIMESTAMP;
  current_metrics RECORD;
  previous_metrics RECORD;
  conversion_rate NUMERIC;
  previous_conversion_rate NUMERIC;
BEGIN
  start_time := NOW() - (hours_back || ' hours')::INTERVAL;
  previous_start_time := NOW() - ((hours_back * 2) || ' hours')::INTERVAL;
  
  -- Get current period metrics
  SELECT 
    COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'page_view') as unique_sessions,
    COUNT(DISTINCT ae.user_id) FILTER (WHERE ae.user_id IS NOT NULL AND is_authentic_user(ae.user_id) = TRUE) as active_users,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as page_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'cart' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as cart_events,
    COUNT(DISTINCT o.id) as orders_count,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')), 0) as revenue
  INTO current_metrics
  FROM analytics_events ae
  LEFT JOIN orders o ON ae.session_id = o.order_number AND o.created_at >= start_time
  WHERE ae.created_at >= start_time;
  
  -- Get previous period metrics for comparison
  SELECT 
    COUNT(DISTINCT ae.session_id) FILTER (WHERE ae.event_type = 'page_view') as unique_sessions,
    COUNT(DISTINCT ae.user_id) FILTER (WHERE ae.user_id IS NOT NULL AND is_authentic_user(ae.user_id) = TRUE) as active_users,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as page_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'cart' AND (ae.user_id IS NULL OR is_authentic_user(ae.user_id) = TRUE)) as cart_events,
    COUNT(DISTINCT o.id) as orders_count,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed')), 0) as revenue
  INTO previous_metrics
  FROM analytics_events ae
  LEFT JOIN orders o ON ae.session_id = o.order_number AND o.created_at >= previous_start_time AND o.created_at < start_time
  WHERE ae.created_at >= previous_start_time AND ae.created_at < start_time;
  
  -- Calculate conversion rates
  conversion_rate := CASE 
    WHEN current_metrics.unique_sessions > 0 THEN (current_metrics.orders_count::NUMERIC / current_metrics.unique_sessions * 100)
    ELSE 0 
  END;
  
  previous_conversion_rate := CASE 
    WHEN previous_metrics.unique_sessions > 0 THEN (previous_metrics.orders_count::NUMERIC / previous_metrics.unique_sessions * 100)
    ELSE 0 
  END;
  
  SELECT json_build_object(
    'active_users', COALESCE(current_metrics.active_users, 0),
    'page_views', COALESCE(current_metrics.page_views, 0),
    'cart_events', COALESCE(current_metrics.cart_events, 0),
    'orders_count', COALESCE(current_metrics.orders_count, 0),
    'revenue', COALESCE(current_metrics.revenue, 0),
    'conversion_rate', COALESCE(conversion_rate, 0),
    'trends', json_build_object(
      'active_users_change', CASE 
        WHEN previous_metrics.active_users > 0 
        THEN ROUND(((current_metrics.active_users - previous_metrics.active_users)::NUMERIC / previous_metrics.active_users * 100), 1)
        ELSE 0 
      END,
      'page_views_change', CASE 
        WHEN previous_metrics.page_views > 0 
        THEN ROUND(((current_metrics.page_views - previous_metrics.page_views)::NUMERIC / previous_metrics.page_views * 100), 1)
        ELSE 0 
      END,
      'cart_events_change', CASE 
        WHEN previous_metrics.cart_events > 0 
        THEN ROUND(((current_metrics.cart_events - previous_metrics.cart_events)::NUMERIC / previous_metrics.cart_events * 100), 1)
        ELSE 0 
      END,
      'orders_change', CASE 
        WHEN previous_metrics.orders_count > 0 
        THEN ROUND(((current_metrics.orders_count - previous_metrics.orders_count)::NUMERIC / previous_metrics.orders_count * 100), 1)
        ELSE 0 
      END,
      'revenue_change', CASE 
        WHEN previous_metrics.revenue > 0 
        THEN ROUND(((current_metrics.revenue - previous_metrics.revenue)::NUMERIC / previous_metrics.revenue * 100), 1)
        ELSE 0 
      END,
      'conversion_change', CASE 
        WHEN previous_conversion_rate > 0 
        THEN ROUND(((conversion_rate - previous_conversion_rate)::NUMERIC / previous_conversion_rate * 100), 1)
        ELSE 0 
      END
    ),
    'updated_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$function$;