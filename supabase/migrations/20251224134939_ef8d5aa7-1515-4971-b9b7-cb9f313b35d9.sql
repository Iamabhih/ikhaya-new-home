-- Fix update_customer_engagement trigger to handle table-specific columns correctly
-- The issue: trigger was evaluating NEW.cart_session_id on cart_sessions table which doesn't have that column

CREATE OR REPLACE FUNCTION public.update_customer_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  customer_email TEXT;
  customer_id UUID;
  session_uuid UUID;
BEGIN
  -- Handle cart_sessions table (uses id directly, not cart_session_id)
  IF TG_TABLE_NAME = 'cart_sessions' THEN
    IF TG_OP != 'DELETE' THEN
      session_uuid := NEW.id;
      customer_email := NEW.email;
      customer_id := NEW.user_id;
    ELSE
      session_uuid := OLD.id;
      customer_email := OLD.email;
      customer_id := OLD.user_id;
    END IF;
  -- Handle enhanced_cart_tracking table (uses cart_session_id FK)
  ELSIF TG_TABLE_NAME = 'enhanced_cart_tracking' THEN
    IF TG_OP != 'DELETE' THEN
      session_uuid := NEW.cart_session_id;
    ELSE
      session_uuid := OLD.cart_session_id;
    END IF;
    
    -- Look up customer info from cart_sessions for enhanced_cart_tracking
    IF session_uuid IS NOT NULL THEN
      SELECT cs.email, cs.user_id INTO customer_email, customer_id
      FROM cart_sessions cs 
      WHERE cs.id = session_uuid;
    END IF;
  ELSE
    -- Unknown table, just return
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Only process engagement metrics if we have valid customer info
  IF session_uuid IS NOT NULL AND (customer_email IS NOT NULL OR customer_id IS NOT NULL) THEN
    INSERT INTO customer_engagement_metrics (user_id, email, last_cart_abandonment_at, total_abandoned_carts)
    VALUES (
      customer_id, 
      customer_email, 
      CASE 
        WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'cart_sessions' AND NEW.abandoned_at IS NOT NULL 
        THEN NEW.abandoned_at 
        ELSE NULL 
      END,
      1
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, customer_engagement_metrics.email),
      last_cart_abandonment_at = CASE 
        WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'cart_sessions' AND NEW.abandoned_at IS NOT NULL 
        THEN NEW.abandoned_at 
        ELSE customer_engagement_metrics.last_cart_abandonment_at 
      END,
      total_abandoned_carts = customer_engagement_metrics.total_abandoned_carts + 1,
      updated_at = now();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;