-- Create atomic order transaction function for process-order edge function
-- This function handles order creation with proper stock validation and locking

CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_number TEXT,
  p_user_id UUID,
  p_order_data JSONB,
  p_order_items JSONB,
  p_pending_order_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  v_product_name TEXT;
  v_product_sku TEXT;
  v_unit_price NUMERIC;
BEGIN
  -- Validate order items have sufficient stock with row-level locking
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    
    -- Lock the product row and check stock
    SELECT stock_quantity, name, sku INTO v_current_stock, v_product_name, v_product_sku
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;
    
    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_product_id;
    END IF;
    
    IF v_current_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product "%". Available: %, Requested: %', 
        v_product_name, v_current_stock, v_quantity;
    END IF;
  END LOOP;
  
  -- Create the order
  INSERT INTO orders (
    order_number,
    user_id,
    email,
    status,
    payment_status,
    billing_address,
    shipping_address,
    delivery_info,
    subtotal,
    shipping_amount,
    total_amount,
    payment_method,
    payment_gateway,
    customer_notes,
    source_channel
  ) VALUES (
    p_order_number,
    p_user_id,
    p_order_data->>'email',
    'pending'::order_status,
    'pending',
    p_order_data->'billing_address',
    p_order_data->'shipping_address',
    p_order_data->'delivery_info',
    (p_order_data->>'subtotal')::NUMERIC,
    (p_order_data->>'shipping_amount')::NUMERIC,
    (p_order_data->>'total_amount')::NUMERIC,
    p_order_data->>'payment_method',
    p_order_data->>'payment_gateway',
    p_order_data->>'customer_notes',
    COALESCE(p_order_data->>'source_channel', 'web')
  )
  RETURNING id INTO v_order_id;
  
  -- Create order items and update stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::NUMERIC;
    v_product_name := v_item->>'product_name';
    v_product_sku := v_item->>'product_sku';
    
    -- Insert order item
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_sku,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      v_product_id,
      v_product_name,
      v_product_sku,
      v_quantity,
      v_unit_price,
      v_unit_price * v_quantity
    );
    
    -- Update stock
    UPDATE products
    SET stock_quantity = stock_quantity - v_quantity,
        updated_at = now()
    WHERE id = v_product_id;
    
    -- Log stock movement
    INSERT INTO stock_movements (
      product_id,
      order_id,
      movement_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      notes
    )
    SELECT 
      v_product_id,
      v_order_id,
      'sale',
      -v_quantity,
      stock_quantity + v_quantity,
      stock_quantity,
      'Order ' || p_order_number
    FROM products WHERE id = v_product_id;
  END LOOP;
  
  -- Delete pending order if provided
  IF p_pending_order_id IS NOT NULL THEN
    DELETE FROM pending_orders WHERE id = p_pending_order_id;
  END IF;
  
  -- Create initial order timeline entry
  INSERT INTO order_timeline (
    order_id,
    event_type,
    event_title,
    event_description
  ) VALUES (
    v_order_id,
    'created',
    'Order created',
    'Order ' || p_order_number || ' was created'
  );
  
  RETURN v_order_id;
END;
$$;