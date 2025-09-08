-- Update RLS policies for orders to allow managers
CREATE POLICY "Managers can view all orders" 
ON public.orders 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for order_items to allow managers
CREATE POLICY "Managers can view all order items" 
ON public.order_items 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for order_notes to allow managers
CREATE POLICY "Managers can manage order notes" 
ON public.order_notes 
FOR ALL 
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for order_timeline to allow managers
CREATE POLICY "Managers can view order timeline" 
ON public.order_timeline 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for fulfillments to allow managers
CREATE POLICY "Managers can manage fulfillments" 
ON public.fulfillments 
FOR ALL 
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for fulfillment_items to allow managers
CREATE POLICY "Managers can manage fulfillment items" 
ON public.fulfillment_items 
FOR ALL 
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for analytics_events to allow managers
CREATE POLICY "Managers can view analytics events" 
ON public.analytics_events 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Update RLS policies for analytics_metrics to allow managers
CREATE POLICY "Managers can view analytics metrics" 
ON public.analytics_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role));

-- Create function to allow superadmins to assign manager role
CREATE OR REPLACE FUNCTION public.create_manager_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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