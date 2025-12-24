-- Create atomic transaction function for order creation
-- This addresses CRITICAL issue #4: No transaction wrapping for order creation
--
-- Purpose: Wrap all order creation steps in a single atomic transaction
-- If ANY step fails, ALL changes are rolled back automatically
--
-- Created: 2025-12-24
-- Issue: AUDIT_REPORT.md #4

CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_number TEXT,
  p_user_id UUID,
  p_order_data JSONB,
  p_order_items JSONB[],
  p_pending_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_record RECORD;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_stock_available INTEGER;
  v_result JSON;
BEGIN
  -- Start transaction (implicit with function)

  -- Step 1: Validate all products have sufficient stock BEFORE creating order
  FOR v_item IN SELECT unnest(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT stock_quantity INTO v_stock_available
    FROM products
    WHERE id = v_product_id
    FOR UPDATE; -- Lock row to prevent race conditions

    IF v_stock_available IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;

    IF v_stock_available < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_product_id, v_stock_available, v_quantity;
    END IF;
  END LOOP;

  -- Step 2: Create the order
  INSERT INTO orders (
    order_number,
    user_id,
    email,
    status,
    payment_status,
    fulfillment_status,
    total_amount,
    shipping_address,
    delivery_info,
    payment_method,
    payment_data,
    notes
  ) VALUES (
    p_order_number,
    p_user_id,
    p_order_data->>'email',
    'confirmed',
    'paid',
    'unfulfilled',
    (p_order_data->>'total_amount')::DECIMAL(10,2),
    p_order_data->'shipping_address',
    p_order_data->'delivery_info',
    COALESCE(p_order_data->>'payment_method', 'payfast'),
    p_order_data->'payment_data',
    COALESCE(p_order_data->>'notes', 'Order processed via payfast_webhook')
  )
  RETURNING * INTO v_order_record;

  v_order_id := v_order_record.id;

  -- Step 3: Create order items and update stock
  FOR v_item IN SELECT unnest(p_order_items)
  LOOP
    -- Insert order item
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price,
      product_snapshot
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL(10,2),
      (v_item->>'total_price')::DECIMAL(10,2),
      v_item->'product_snapshot'
    );

    -- Update product stock (atomic)
    UPDATE products
    SET
      stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
      updated_at = now()
    WHERE id = (v_item->>'product_id')::UUID;

    -- Log stock movement
    INSERT INTO stock_movements (
      product_id,
      order_id,
      movement_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      notes
    ) VALUES (
      (v_item->>'product_id')::UUID,
      v_order_id,
      'sale',
      -(v_item->>'quantity')::INTEGER,
      (SELECT stock_quantity + (v_item->>'quantity')::INTEGER FROM products WHERE id = (v_item->>'product_id')::UUID),
      (SELECT stock_quantity FROM products WHERE id = (v_item->>'product_id')::UUID),
      'Automatic stock deduction from order ' || p_order_number
    );
  END LOOP;

  -- Step 4: Create order timeline entry
  INSERT INTO order_timeline (
    order_id,
    event_type,
    event_title,
    event_description,
    metadata
  ) VALUES (
    v_order_id,
    'status_change',
    'Order Created',
    'Order created and payment confirmed via PayFast',
    jsonb_build_object(
      'source', 'payfast_webhook',
      'payment_method', 'payfast',
      'order_number', p_order_number
    )
  );

  -- Step 5: Delete pending order (cleanup)
  DELETE FROM pending_orders
  WHERE id = p_pending_order_id;

  -- Step 6: Track analytics
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_name,
    order_id,
    metadata
  ) VALUES (
    p_user_id,
    'purchase',
    'order_completed',
    v_order_id,
    jsonb_build_object(
      'total_amount', p_order_data->>'total_amount',
      'item_count', array_length(p_order_items, 1),
      'payment_method', 'payfast',
      'source', 'payfast_webhook'
    )
  );

  -- Return success with order details
  SELECT json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'message', 'Order created successfully'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction automatically rolls back on exception
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'order_number', p_order_number
    );
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.create_order_transaction IS
'Atomically creates an order with all related records. Validates stock, creates order, order items, updates inventory, and logs analytics. Rolls back entirely if any step fails.';

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.create_order_transaction TO service_role;
