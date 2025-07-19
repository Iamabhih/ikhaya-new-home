-- Fix RLS policies for order_timeline table to allow admin inserts

-- Drop and recreate the policy to allow admins to insert timeline entries
DROP POLICY IF EXISTS "Admins can view all order timeline" ON order_timeline;

-- Allow admins to manage (view/insert) timeline entries  
CREATE POLICY "Admins can manage all order timeline"
ON order_timeline FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Keep the user view policy
CREATE POLICY "Users can view timeline for their orders"
ON order_timeline FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_timeline.order_id 
    AND orders.user_id = auth.uid()
  )
);