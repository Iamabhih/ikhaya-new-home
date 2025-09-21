-- Fix remaining database function security issues (SET search_path = public)
-- This addresses the remaining 10 security warnings from the linter

-- Fix all remaining functions to include SET search_path = public

-- 1. Fix create_admin_user function
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only allow superadmins to create admin users
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: Only superadmins can create admin users';
  END IF;
  
  -- Get user ID from email
  SELECT id INTO target_user_id 
  FROM public.profiles 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Add admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    auth.uid(), 'admin_action', 'role_assigned',
    jsonb_build_object('target_user_id', target_user_id, 'role', 'admin')
  );
  
  RETURN true;
END;
$$;

-- 2. Fix search_products function
CREATE OR REPLACE FUNCTION public.search_products(search_query text, category_filter uuid DEFAULT NULL::uuid, min_price numeric DEFAULT NULL::numeric, max_price numeric DEFAULT NULL::numeric, in_stock_only boolean DEFAULT NULL::boolean, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0)
RETURNS TABLE(id uuid, name text, slug text, price numeric, compare_at_price numeric, stock_quantity integer, is_active boolean, is_featured boolean, category_id uuid, created_at timestamp with time zone, category_name text, image_url text, search_rank real)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.price,
    p.compare_at_price,
    p.stock_quantity,
    p.is_active,
    p.is_featured,
    p.category_id,
    p.created_at,
    c.name as category_name,
    pi.image_url,
    CASE 
      WHEN search_query IS NOT NULL AND search_query != '' 
      THEN ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')), plainto_tsquery('english', search_query))
      ELSE 0
    END as search_rank
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
  WHERE 
    p.is_active = true
    AND (search_query IS NULL OR search_query = '' OR 
         to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')) @@ plainto_tsquery('english', search_query))
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (in_stock_only IS NULL OR (in_stock_only = true AND p.stock_quantity > 0) OR (in_stock_only = false))
  ORDER BY 
    CASE WHEN search_query IS NOT NULL AND search_query != '' THEN search_rank END DESC,
    p.is_featured DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- 3. Fix create_superadmin_user function
CREATE OR REPLACE FUNCTION public.create_superadmin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only allow existing superadmins to create other superadmins
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: Only superadmins can create superadmin users';
  END IF;
  
  -- Get user ID from email
  SELECT id INTO target_user_id 
  FROM public.profiles 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Add superadmin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'superadmin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    auth.uid(), 'admin_action', 'role_assigned',
    jsonb_build_object('target_user_id', target_user_id, 'role', 'superadmin')
  );
  
  RETURN true;
END;
$$;

-- 4. Fix bulk_update_order_status function
CREATE OR REPLACE FUNCTION public.bulk_update_order_status(order_ids uuid[], new_status order_status, notes text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER := 0;
  order_id UUID;
BEGIN
  -- Check if user has admin role
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin access required';
  END IF;

  -- Update each order
  FOREACH order_id IN ARRAY order_ids
  LOOP
    UPDATE public.orders 
    SET status = new_status, updated_at = now()
    WHERE id = order_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
      
      -- Add note if provided
      IF notes IS NOT NULL THEN
        INSERT INTO public.order_notes (order_id, author_id, note_type, content)
        VALUES (order_id, auth.uid(), 'internal', notes);
      END IF;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- 5. Fix update_product_stock (first version) function
CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity_change integer, p_movement_type text, p_order_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO current_stock 
  FROM public.products 
  WHERE id = p_product_id;
  
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  new_stock := current_stock + p_quantity_change;
  
  -- Prevent negative stock for sales
  IF p_movement_type = 'sale' AND new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', current_stock, ABS(p_quantity_change);
  END IF;
  
  -- Update product stock
  UPDATE public.products 
  SET stock_quantity = new_stock, updated_at = now()
  WHERE id = p_product_id;
  
  -- Log the movement
  INSERT INTO public.stock_movements (
    product_id, order_id, movement_type, quantity_change, 
    previous_quantity, new_quantity, notes
  ) VALUES (
    p_product_id, p_order_id, p_movement_type, p_quantity_change,
    current_stock, new_stock, p_notes
  );
  
  RETURN TRUE;
END;
$$;

-- 6. Fix assign_user_role function
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, target_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only superadmins can assign roles
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: Only superadmins can assign roles';
  END IF;
  
  -- Validate target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    auth.uid(), 'admin_action', 'role_assigned',
    jsonb_build_object('target_user_id', target_user_id, 'role', target_role)
  );
  
  RETURN true;
END;
$$;

-- 7. Fix remove_user_role function
CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id uuid, target_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only superadmins can remove roles
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: Only superadmins can remove roles';
  END IF;
  
  -- Prevent removing the last superadmin
  IF target_role = 'superadmin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'superadmin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last superadmin user';
    END IF;
  END IF;
  
  -- Remove the role
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = target_role;
  
  -- Log the action
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    auth.uid(), 'admin_action', 'role_removed',
    jsonb_build_object('target_user_id', target_user_id, 'role', target_role)
  );
  
  RETURN true;
END;
$$;

-- 8. Fix create_manager_user function
CREATE OR REPLACE FUNCTION public.create_manager_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only allow superadmins to create manager users
  IF NOT has_role(auth.uid(), 'superadmin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions: Only superadmins can create manager users';
  END IF;
  
  -- Get user ID from email
  SELECT id INTO target_user_id 
  FROM public.profiles 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Add manager role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    auth.uid(), 'admin_action', 'role_assigned',
    jsonb_build_object('target_user_id', target_user_id, 'role', 'manager')
  );
  
  RETURN true;
END;
$$;

-- 9. Fix cleanup_expired_pending_orders function
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete pending orders older than 2 hours (giving more time for PayFast webhook)
  DELETE FROM public.pending_orders 
  WHERE created_at < now() - interval '2 hours';
END;
$$;

-- 10. Fix update_customer_engagement function
CREATE OR REPLACE FUNCTION public.update_customer_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix remaining functions that need search_path

-- Fix link_anonymous_orders_to_user function  
CREATE OR REPLACE FUNCTION public.link_anonymous_orders_to_user(p_user_id uuid, p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_count INTEGER := 0;
BEGIN
  -- Link orders that match the email but have no user_id
  UPDATE public.orders 
  SET user_id = p_user_id, updated_at = now()
  WHERE email = p_email AND user_id IS NULL;
  
  GET DIAGNOSTICS linked_count = ROW_COUNT;
  
  -- Log the linking
  IF linked_count > 0 THEN
    INSERT INTO public.analytics_events (
      user_id, event_type, event_name, metadata
    ) VALUES (
      p_user_id, 'account', 'orders_linked_to_user',
      jsonb_build_object('linked_orders', linked_count, 'email', p_email)
    );
  END IF;
  
  RETURN linked_count;
END;
$$;

-- Fix create_user_from_order function
CREATE OR REPLACE FUNCTION public.create_user_from_order(p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_order_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
BEGIN
  -- Generate a temporary password using gen_random_uuid
  temp_password := replace(gen_random_uuid()::text, '-', '');
  
  -- Create the auth user (this will trigger our handle_new_user function)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(temp_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'first_name', COALESCE(p_first_name, ''),
      'last_name', COALESCE(p_last_name, ''),
      'created_from_order', true
    ),
    false
  ) RETURNING id INTO new_user_id;
  
  -- Link the order to this new user if order_id provided
  IF p_order_id IS NOT NULL THEN
    UPDATE public.orders 
    SET user_id = new_user_id
    WHERE id = p_order_id;
  END IF;
  
  -- Log the account creation
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    new_user_id, 'account', 'user_created_from_order',
    jsonb_build_object('order_id', p_order_id, 'email', p_email)
  );
  
  RETURN new_user_id;
END;
$$;

-- Fix update_cart_session_metrics function
CREATE OR REPLACE FUNCTION public.update_cart_session_metrics()
RETURNS trigger
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

-- Fix get_realtime_metrics function
CREATE OR REPLACE FUNCTION public.get_realtime_metrics(hours_back integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create indexes for better order query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created_at ON public.orders(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_email_created_at ON public.orders(email, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id_created_at ON public.orders(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_timeline_order_id ON public.order_timeline(order_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_notes_order_id ON public.order_notes(order_id, created_at DESC);