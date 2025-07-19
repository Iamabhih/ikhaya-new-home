-- Fix RLS policies for order_timeline table to allow admin inserts

-- Drop the existing read-only policy for admins  
DROP POLICY IF EXISTS "Admins can view all order timeline" ON order_timeline;

-- Create a comprehensive policy that allows admins to manage all timeline operations
CREATE POLICY "Admins can manage all order timeline"
ON order_timeline FOR ALL
TO authenticated  
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));