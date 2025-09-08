-- Update RLS policy to allow managers to view all return requests
DROP POLICY IF EXISTS "Admin can view all return requests" ON public.return_requests;

-- Create new policy that allows both admins and managers
CREATE POLICY "Admins and managers can view all return requests" 
ON public.return_requests 
FOR ALL
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Also update any related tables that managers might need access to
-- Check if return_items table exists and update its policy
CREATE POLICY "Admins and managers can manage return items" 
ON public.return_items 
FOR ALL
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);