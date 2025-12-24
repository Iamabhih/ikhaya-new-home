-- Prevent negative stock quantities for ALL movement types
-- This addresses MEDIUM issue #27: Product stock can go negative
--
-- Problem: Stock can go negative for non-sale movements (adjustments, returns, etc.)
-- Solution: Add check constraint and update function to prevent negative stock
--
-- Created: 2025-12-24
-- Issue: AUDIT_REPORT.md #27

-- Add check constraint to products table
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_stock_quantity_check;

ALTER TABLE public.products
ADD CONSTRAINT products_stock_quantity_check
CHECK (stock_quantity >= 0);

-- Update update_product_stock function to prevent negative stock for ALL movements
CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_movement_type TEXT,
  p_order_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
  -- Get current stock with row lock to prevent race conditions
  SELECT stock_quantity INTO current_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  new_stock := current_stock + p_quantity_change;

  -- ALWAYS prevent negative stock, regardless of movement type
  IF new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested change: %, Movement type: %',
      p_product_id, current_stock, p_quantity_change, p_movement_type;
  END IF;

  -- Update product stock
  UPDATE public.products
  SET stock_quantity = new_stock, updated_at = now()
  WHERE id = p_product_id;

  -- Log the movement
  INSERT INTO public.stock_movements (
    product_id,
    order_id,
    movement_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    notes
  ) VALUES (
    p_product_id,
    p_order_id,
    p_movement_type,
    p_quantity_change,
    current_stock,
    new_stock,
    p_notes
  );

  RETURN TRUE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.update_product_stock IS
'Updates product stock quantity and logs the movement. Prevents negative stock for ALL movement types. Uses row-level locking to prevent race conditions.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_product_stock TO service_role;

-- Create index on stock_quantity for faster low-stock queries
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity) WHERE stock_quantity < 10;

COMMENT ON INDEX idx_products_stock_quantity IS 'Partial index for low-stock product queries';
