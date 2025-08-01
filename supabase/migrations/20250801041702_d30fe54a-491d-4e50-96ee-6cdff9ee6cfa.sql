-- Add missing INSERT policy for order_items table
-- This allows users to insert order items when creating orders
CREATE POLICY "Users can insert order items for their orders" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      (auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) 
      OR (auth.uid() IS NULL AND orders.user_id IS NULL)
    )
  )
);