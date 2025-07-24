-- Phase 1: Critical Security Fixes

-- 1. Fix search_path vulnerabilities in database functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_superadmin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.bulk_update_order_status(order_ids uuid[], new_status order_status, notes text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity_change integer, p_movement_type text, p_order_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 2. Create secure role management functions
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id uuid, target_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.remove_user_role(target_user_id uuid, target_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 3. Enhanced RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Superadmins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only secure functions can modify roles" 
ON public.user_roles 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- 4. Create rate limiting table for authentication
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or IP
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON public.auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON public.auth_rate_limits(window_start);

-- RLS for rate limiting table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (true);

-- 5. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_description text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  risk_level text DEFAULT 'low', -- low, medium, high, critical
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_risk_level ON public.security_audit_log(risk_level);

-- RLS for audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Service can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);