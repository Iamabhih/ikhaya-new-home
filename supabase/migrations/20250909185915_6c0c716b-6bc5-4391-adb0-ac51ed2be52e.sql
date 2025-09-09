-- Fix search path security issues for the functions we just updated
CREATE OR REPLACE FUNCTION public.update_cart_session_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update cart session when items are added/removed
  IF TG_OP = 'INSERT' THEN
    -- Check if the table has cart_session_id column
    IF TG_TABLE_NAME = 'enhanced_cart_tracking' AND NEW.cart_session_id IS NOT NULL THEN
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
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix search path security issues for customer engagement function
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
  -- Check if we're dealing with a table that has cart_session_id
  IF TG_TABLE_NAME = 'enhanced_cart_tracking' OR TG_TABLE_NAME = 'cart_sessions' THEN
    -- Get cart_session_id safely
    session_id := CASE 
      WHEN TG_TABLE_NAME = 'enhanced_cart_tracking' THEN 
        CASE WHEN TG_OP = 'DELETE' THEN OLD.cart_session_id ELSE NEW.cart_session_id END
      WHEN TG_TABLE_NAME = 'cart_sessions' THEN 
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
      ELSE NULL
    END;
    
    -- Get customer info from cart session if we have a session_id
    IF session_id IS NOT NULL THEN
      SELECT cs.email, cs.user_id INTO customer_email, customer_id
      FROM cart_sessions cs 
      WHERE cs.id = session_id;
      
      IF customer_email IS NOT NULL OR customer_id IS NOT NULL THEN
        INSERT INTO customer_engagement_metrics (user_id, email, last_cart_abandonment_at, total_abandoned_carts)
        VALUES (
          customer_id, 
          customer_email, 
          CASE WHEN TG_OP = 'UPDATE' AND NEW IS NOT NULL THEN
            CASE WHEN TG_TABLE_NAME = 'cart_sessions' AND NEW.abandoned_at IS NOT NULL THEN NEW.abandoned_at ELSE NULL END
            ELSE NULL
          END,
          1
        )
        ON CONFLICT (COALESCE(user_id, gen_random_uuid())) DO UPDATE SET
          last_cart_abandonment_at = CASE 
            WHEN TG_OP = 'UPDATE' AND NEW IS NOT NULL AND TG_TABLE_NAME = 'cart_sessions' AND NEW.abandoned_at IS NOT NULL 
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