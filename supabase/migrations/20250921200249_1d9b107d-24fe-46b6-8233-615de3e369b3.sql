-- Update the order_items INSERT policy to allow admins to create order items for any order
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;

CREATE POLICY "Users can insert order items for their orders" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  EXISTS ( 
    SELECT 1
    FROM orders
    WHERE orders.id = order_items.order_id 
    AND (
      -- Admin override: admins can create order items for any order
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) OR
      -- Original conditions: users for their orders, anonymous for anonymous orders
      (((auth.uid() IS NOT NULL) AND (orders.user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (orders.user_id IS NULL)))
    )
  )
);