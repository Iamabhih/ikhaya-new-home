-- Prevent negative stock: Add check constraint and update stock function
-- Note: Using a trigger instead of CHECK constraint because CHECK constraints must be immutable

-- Create trigger function to prevent negative stock
CREATE OR REPLACE FUNCTION public.prevent_negative_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative. Product: %, Attempted value: %', 
      NEW.name, NEW.stock_quantity;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on products table
DROP TRIGGER IF EXISTS check_stock_not_negative ON products;
CREATE TRIGGER check_stock_not_negative
  BEFORE INSERT OR UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_negative_stock();

-- Update the update_product_stock function to handle all movement types safely
CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id uuid, 
  p_quantity_change integer, 
  p_movement_type text, 
  p_order_id uuid DEFAULT NULL, 
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Get current stock with lock
  SELECT stock_quantity INTO current_stock 
  FROM public.products 
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
  
  new_stock := current_stock + p_quantity_change;
  
  -- Prevent negative stock for all movement types that reduce stock
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested change: %', 
      current_stock, p_quantity_change;
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
$$;