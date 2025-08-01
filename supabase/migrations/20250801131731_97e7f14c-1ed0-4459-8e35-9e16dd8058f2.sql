-- Add missing DELETE policies for orders and related tables

-- Allow admins to delete orders
CREATE POLICY "Admins can delete orders" ON orders 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete order items
CREATE POLICY "Admins can delete order items" ON order_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete order status history
CREATE POLICY "Admins can delete order status history" ON order_status_history 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));