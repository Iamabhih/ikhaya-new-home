-- Add comprehensive manager permissions for all tables they need access to

-- Add manager permissions for analytics_events
DROP POLICY IF EXISTS "Managers can view analytics events" ON public.analytics_events;
CREATE POLICY "Managers can view analytics events" 
ON public.analytics_events 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Add manager permissions for return_requests if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'return_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Managers can manage return requests" ON public.return_requests';
    EXECUTE 'CREATE POLICY "Managers can manage return requests" ON public.return_requests FOR ALL TO public USING (has_role(auth.uid(), ''manager''::app_role)) WITH CHECK (has_role(auth.uid(), ''manager''::app_role))';
  END IF;
END
$$;

-- Add manager permissions for return_items if table exists  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'return_items') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Managers can manage return items" ON public.return_items';
    EXECUTE 'CREATE POLICY "Managers can manage return items" ON public.return_items FOR ALL TO public USING (has_role(auth.uid(), ''manager''::app_role)) WITH CHECK (has_role(auth.uid(), ''manager''::app_role))';
  END IF;
END
$$;

-- Ensure managers can view profiles for customer data
DROP POLICY IF EXISTS "Managers can view profiles" ON public.profiles;
CREATE POLICY "Managers can view profiles" 
ON public.profiles 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));

-- Add manager permissions for reviews if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Managers can view reviews" ON public.reviews';
    EXECUTE 'CREATE POLICY "Managers can view reviews" ON public.reviews FOR SELECT TO public USING (has_role(auth.uid(), ''manager''::app_role))';
  END IF;
END
$$;

-- Add manager permissions for user_roles to check roles
DROP POLICY IF EXISTS "Managers can view user roles" ON public.user_roles;
CREATE POLICY "Managers can view user roles" 
ON public.user_roles 
FOR SELECT
TO public
USING (has_role(auth.uid(), 'manager'::app_role));