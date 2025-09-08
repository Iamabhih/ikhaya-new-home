-- First check what policies exist and drop them
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins and managers can view all return requests" ON public.return_requests;
    DROP POLICY IF EXISTS "Admin can view all return requests" ON public.return_requests;
    DROP POLICY IF EXISTS "Admins and managers can manage return items" ON public.return_items;
END
$$;

-- Create new policies that allow managers access
CREATE POLICY "Admins and managers can manage return requests" 
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

-- Check if return_items table exists and create policy for it
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'return_items') THEN
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
    END IF;
END
$$;