-- Fix remaining issues with OLD record access and add proper search paths to more functions
CREATE OR REPLACE FUNCTION public.update_cart_session_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix remaining issues with OLD record access for customer engagement
CREATE OR REPLACE FUNCTION public.update_customer_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  customer_email TEXT;
  customer_id UUID;
  session_id UUID;
BEGIN
  -- Only process specific tables that have the required fields
  IF TG_TABLE_NAME IN ('enhanced_cart_tracking', 'cart_sessions') THEN
    -- Get cart_session_id safely based on table and operation
    session_id := CASE 
      WHEN TG_TABLE_NAME = 'enhanced_cart_tracking' AND TG_OP != 'DELETE' AND NEW.cart_session_id IS NOT NULL THEN NEW.cart_session_id
      WHEN TG_TABLE_NAME = 'enhanced_cart_tracking' AND TG_OP = 'DELETE' AND OLD.cart_session_id IS NOT NULL THEN OLD.cart_session_id
      WHEN TG_TABLE_NAME = 'cart_sessions' AND TG_OP != 'DELETE' THEN NEW.id
      WHEN TG_TABLE_NAME = 'cart_sessions' AND TG_OP = 'DELETE' THEN OLD.id
      ELSE NULL
    END;
    
    -- Process engagement metrics if we have a valid session_id
    IF session_id IS NOT NULL THEN
      SELECT cs.email, cs.user_id INTO customer_email, customer_id
      FROM cart_sessions cs 
      WHERE cs.id = session_id;
      
      IF customer_email IS NOT NULL OR customer_id IS NOT NULL THEN
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
        ON CONFLICT (COALESCE(user_id, gen_random_uuid())) DO UPDATE SET
          last_cart_abandonment_at = CASE 
            WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'cart_sessions' AND NEW.abandoned_at IS NOT NULL 
            THEN NEW.abandoned_at 
            ELSE customer_engagement_metrics.last_cart_abandonment_at 
          END,
          total_abandoned_carts = customer_engagement_metrics.total_abandoned_carts + 1,
          updated_at = now();
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;