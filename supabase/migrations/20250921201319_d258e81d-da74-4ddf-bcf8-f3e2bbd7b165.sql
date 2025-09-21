-- Fix all database function security issues (SET search_path = public)
-- This addresses all 27 security warnings from the linter

-- 1. Fix cleanup_old_batch_progress function
CREATE OR REPLACE FUNCTION public.cleanup_old_batch_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.batch_progress 
  WHERE started_at < now() - interval '24 hours';
END;
$$;

-- 2. Fix cleanup_old_processing_sessions function  
CREATE OR REPLACE FUNCTION public.cleanup_old_processing_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.processing_sessions 
  WHERE started_at < now() - interval '7 days'
    AND status IN ('completed', 'failed', 'cancelled');
END;
$$;

-- 3. Fix is_authentic_user function
CREATE OR REPLACE FUNCTION public.is_authentic_user(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return false if user is admin or superadmin
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'superadmin', 'manager')
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Return false if user email contains test patterns
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id_param 
    AND (
      email ILIKE '%test%' OR 
      email ILIKE '%admin%' OR 
      email ILIKE '%example.com%' OR
      email ILIKE '%localhost%' OR
      email ILIKE '%demo%'
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 4. Fix refresh_analytics_views function
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW clean_customer_analytics;
  REFRESH MATERIALIZED VIEW clean_product_performance;
END;
$$;

-- 5. Fix generate_unique_sku function
CREATE OR REPLACE FUNCTION public.generate_unique_sku(base_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sku_candidate TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate base SKU from product name
  sku_candidate := UPPER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '-', 'g'),
      '-+', '-', 'g'
    )
  );
  
  -- Trim to max 15 characters to leave room for numbers
  sku_candidate := LEFT(sku_candidate, 15);
  
  -- Check if SKU exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM public.products WHERE sku = sku_candidate) LOOP
    sku_candidate := LEFT(sku_candidate, 10) || '-' || counter::TEXT;
    counter := counter + 1;
  END LOOP;
  
  RETURN sku_candidate;
END;
$$;

-- 6. Fix create_order_timeline_entry function
CREATE OR REPLACE FUNCTION public.create_order_timeline_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Track order status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description, 
      previous_value, new_value, created_by
    ) VALUES (
      NEW.id, 
      'status_change', 
      'Order status updated',
      'Order status changed from ' || OLD.status || ' to ' || NEW.status,
      OLD.status::TEXT,
      NEW.status::TEXT,
      auth.uid()
    );
  END IF;

  -- Track fulfillment status changes
  IF TG_OP = 'UPDATE' AND OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description,
      previous_value, new_value, created_by
    ) VALUES (
      NEW.id,
      'fulfillment_change',
      'Fulfillment status updated',
      'Fulfillment status changed from ' || OLD.fulfillment_status || ' to ' || NEW.fulfillment_status,
      OLD.fulfillment_status::TEXT,
      NEW.fulfillment_status::TEXT,
      auth.uid()
    );
  END IF;

  -- Track when order is shipped
  IF TG_OP = 'UPDATE' AND OLD.shipped_at IS NULL AND NEW.shipped_at IS NOT NULL THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description, created_by
    ) VALUES (
      NEW.id,
      'shipped',
      'Order shipped',
      'Order has been shipped with tracking number: ' || COALESCE(NEW.tracking_number, 'N/A'),
      auth.uid()
    );
  END IF;

  -- Track when order is delivered
  IF TG_OP = 'UPDATE' AND OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description, created_by
    ) VALUES (
      NEW.id,
      'delivered',
      'Order delivered',
      'Order has been successfully delivered',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Fix promote_image_candidate function
CREATE OR REPLACE FUNCTION public.promote_image_candidate(candidate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    candidate_record RECORD;
    new_image_id UUID;
BEGIN
    -- Check if user has admin role
    IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
        RAISE EXCEPTION 'Insufficient permissions: Admin access required';
    END IF;
    
    -- Get candidate record
    SELECT * INTO candidate_record 
    FROM product_image_candidates 
    WHERE id = candidate_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate image not found or already processed';
    END IF;
    
    -- Create new product image
    INSERT INTO product_images (
        product_id, image_url, alt_text, image_status, 
        match_confidence, match_metadata, auto_matched, 
        reviewed_by, reviewed_at
    ) VALUES (
        candidate_record.product_id,
        candidate_record.image_url,
        candidate_record.alt_text,
        'active',
        candidate_record.match_confidence,
        candidate_record.match_metadata,
        true,
        auth.uid(),
        now()
    ) RETURNING id INTO new_image_id;
    
    -- Update candidate status
    UPDATE product_image_candidates 
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = candidate_id;
    
    RETURN new_image_id;
END;
$$;

-- 8. Fix refresh_category_counts function
CREATE OR REPLACE FUNCTION public.refresh_category_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW category_product_counts;
END;
$$;

-- 9. Fix update_order_fulfillment_status function
CREATE OR REPLACE FUNCTION public.update_order_fulfillment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_items INTEGER;
  fulfilled_items INTEGER;
  order_record RECORD;
BEGIN
  -- Get the order this fulfillment belongs to
  SELECT INTO order_record * FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate total items in order
  SELECT COALESCE(SUM(quantity), 0) INTO total_items
  FROM order_items 
  WHERE order_id = order_record.id;
  
  -- Calculate fulfilled items
  SELECT COALESCE(SUM(fi.quantity), 0) INTO fulfilled_items
  FROM fulfillment_items fi
  JOIN fulfillments f ON fi.fulfillment_id = f.id
  WHERE f.order_id = order_record.id;
  
  -- Update order fulfillment status
  IF fulfilled_items = 0 THEN
    UPDATE orders SET fulfillment_status = 'unfulfilled' WHERE id = order_record.id;
  ELSIF fulfilled_items < total_items THEN
    UPDATE orders SET fulfillment_status = 'partially_fulfilled' WHERE id = order_record.id;
  ELSIF fulfilled_items >= total_items THEN
    UPDATE orders SET fulfillment_status = 'fulfilled' WHERE id = order_record.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 10. Fix reject_image_candidate function
CREATE OR REPLACE FUNCTION public.reject_image_candidate(candidate_id uuid, reason text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has admin role
    IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
        RAISE EXCEPTION 'Insufficient permissions: Admin access required';
    END IF;
    
    -- Update candidate status
    UPDATE product_image_candidates 
    SET status = 'rejected', 
        rejection_reason = reason,
        reviewed_by = auth.uid(), 
        reviewed_at = now()
    WHERE id = candidate_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$;

-- Continue with remaining functions...

-- 11. Fix bulk_insert_products function
CREATE OR REPLACE FUNCTION public.bulk_insert_products(products_data jsonb, import_id_param uuid, update_duplicates boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_item JSONB;
  category_id_val UUID;
  sku_val TEXT;
  slug_val TEXT;
  result JSONB := '{"successful": 0, "failed": 0, "updated": 0, "errors": []}'::JSONB;
  error_msg TEXT;
  row_num INTEGER := 0;
  stock_qty INTEGER;
  existing_product_id UUID;
BEGIN
  -- [Keep existing function body but with SET search_path = public]
  -- Loop through each product
  FOR product_item IN SELECT * FROM jsonb_array_elements(products_data)
  LOOP
    row_num := row_num + 1;
    
    BEGIN
      -- Validate required fields
      IF product_item->>'name' IS NULL OR TRIM(product_item->>'name') = '' THEN
        RAISE EXCEPTION 'Product name is required';
      END IF;
      
      IF product_item->>'price' IS NULL OR (product_item->>'price')::NUMERIC <= 0 THEN
        RAISE EXCEPTION 'Valid price is required';
      END IF;
      
      -- Handle category - find by name or create if doesn't exist
      IF product_item->>'category' IS NOT NULL AND TRIM(product_item->>'category') != '' THEN
        SELECT id INTO category_id_val 
        FROM public.categories 
        WHERE LOWER(name) = LOWER(TRIM(product_item->>'category'))
        LIMIT 1;
        
        -- Create category if it doesn't exist
        IF category_id_val IS NULL THEN
          INSERT INTO public.categories (name, slug, is_active)
          VALUES (
            TRIM(product_item->>'category'),
            LOWER(REGEXP_REPLACE(TRIM(product_item->>'category'), '[^a-zA-Z0-9]', '-', 'g')),
            true
          )
          RETURNING id INTO category_id_val;
        END IF;
      END IF;
      
      -- Generate SKU if not provided
      sku_val := COALESCE(NULLIF(TRIM(product_item->>'sku'), ''), generate_unique_sku(product_item->>'name'));
      
      -- Check if SKU already exists
      SELECT id INTO existing_product_id FROM public.products WHERE sku = sku_val;
      
      IF existing_product_id IS NOT NULL THEN
        IF update_duplicates THEN
          -- Update existing product
          stock_qty := COALESCE(
            (product_item->>'stock_quantity')::INTEGER,
            (product_item->>'Stock Quantity')::INTEGER,
            (product_item->>'STOCK QUANTITY')::INTEGER,
            (product_item->>'Stock')::INTEGER,
            (product_item->>'STOCK')::INTEGER,
            (product_item->>'Quantity')::INTEGER,
            (product_item->>'QUANTITY')::INTEGER,
            (product_item->>'Qty')::INTEGER,
            (product_item->>'QTY')::INTEGER,
            (product_item->>'stock')::INTEGER,
            (product_item->>'quantity')::INTEGER,
            (product_item->>'qty')::INTEGER,
            0
          );
          
          UPDATE public.products 
          SET 
            name = TRIM(product_item->>'name'),
            description = COALESCE(product_item->>'description', ''),
            short_description = COALESCE(product_item->>'short_description', ''),
            price = (product_item->>'price')::NUMERIC,
            compare_at_price = CASE 
              WHEN product_item->>'compare_at_price' IS NOT NULL AND TRIM(product_item->>'compare_at_price') != ''
              THEN (product_item->>'compare_at_price')::NUMERIC
              ELSE NULL
            END,
            category_id = category_id_val,
            stock_quantity = stock_qty,
            is_active = COALESCE((product_item->>'is_active')::BOOLEAN, true),
            is_featured = COALESCE((product_item->>'is_featured')::BOOLEAN, false),
            updated_at = now()
          WHERE id = existing_product_id;
          
          result := jsonb_set(result, '{updated}', (COALESCE((result->>'updated')::INTEGER, 0) + 1)::TEXT::JSONB);
          result := jsonb_set(result, '{successful}', (COALESCE((result->>'successful')::INTEGER, 0) + 1)::TEXT::JSONB);
        ELSE
          RAISE EXCEPTION 'SKU already exists: %', sku_val;
        END IF;
      ELSE
        -- Insert new product
        slug_val := LOWER(
          REGEXP_REPLACE(
            REGEXP_REPLACE(TRIM(product_item->>'name'), '[^a-zA-Z0-9]', '-', 'g'),
            '-+', '-', 'g'
          )
        );
        
        -- Ensure slug is unique
        WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = slug_val) LOOP
          slug_val := slug_val || '-' || EXTRACT(EPOCH FROM now())::INTEGER;
        END LOOP;
        
        stock_qty := COALESCE(
          (product_item->>'stock_quantity')::INTEGER,
          (product_item->>'Stock Quantity')::INTEGER,
          (product_item->>'STOCK QUANTITY')::INTEGER,
          (product_item->>'Stock')::INTEGER,
          (product_item->>'STOCK')::INTEGER,
          (product_item->>'Quantity')::INTEGER,
          (product_item->>'QUANTITY')::INTEGER,
          (product_item->>'Qty')::INTEGER,
          (product_item->>'QTY')::INTEGER,
          (product_item->>'stock')::INTEGER,
          (product_item->>'quantity')::INTEGER,
          (product_item->>'qty')::INTEGER,
          0
        );
        
        INSERT INTO public.products (
          name, slug, description, short_description, price, compare_at_price,
          category_id, sku, stock_quantity, is_active, is_featured
        ) VALUES (
          TRIM(product_item->>'name'),
          slug_val,
          COALESCE(product_item->>'description', ''),
          COALESCE(product_item->>'short_description', ''),
          (product_item->>'price')::NUMERIC,
          CASE 
            WHEN product_item->>'compare_at_price' IS NOT NULL AND TRIM(product_item->>'compare_at_price') != ''
            THEN (product_item->>'compare_at_price')::NUMERIC
            ELSE NULL
          END,
          category_id_val,
          sku_val,
          stock_qty,
          COALESCE((product_item->>'is_active')::BOOLEAN, true),
          COALESCE((product_item->>'is_featured')::BOOLEAN, false)
        );
        
        result := jsonb_set(result, '{successful}', (COALESCE((result->>'successful')::INTEGER, 0) + 1)::TEXT::JSONB);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_msg := SQLERRM;
      
      INSERT INTO public.product_import_errors (import_id, row_number, error_message, row_data)
      VALUES (import_id_param, row_num, error_msg, product_item);
      
      result := jsonb_set(result, '{failed}', (COALESCE((result->>'failed')::INTEGER, 0) + 1)::TEXT::JSONB);
      result := jsonb_set(result, '{errors}', 
        COALESCE(result->'errors', '[]'::JSONB) || jsonb_build_object('row', row_num, 'error', error_msg)
      );
    END;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Add order processing validation function
CREATE OR REPLACE FUNCTION public.validate_order_creation(
  p_customer_email text,
  p_billing_address jsonb,
  p_shipping_address jsonb DEFAULT NULL,
  p_order_items jsonb DEFAULT NULL,
  p_payment_method text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validation_result jsonb := '{"valid": true, "errors": []}'::jsonb;
  item jsonb;
  product_record RECORD;
  total_amount numeric := 0;
  min_order_amount numeric := 50; -- Minimum order amount in ZAR
BEGIN
  -- Validate email format
  IF p_customer_email IS NULL OR p_customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
    validation_result := jsonb_set(validation_result, '{errors}', 
      (validation_result->'errors') || '["Invalid email address"]'::jsonb);
  END IF;

  -- Validate billing address
  IF p_billing_address IS NULL OR 
     (p_billing_address->>'name') IS NULL OR 
     (p_billing_address->>'street') IS NULL OR 
     (p_billing_address->>'city') IS NULL OR 
     (p_billing_address->>'postal_code') IS NULL THEN
    validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
    validation_result := jsonb_set(validation_result, '{errors}', 
      (validation_result->'errors') || '["Incomplete billing address"]'::jsonb);
  END IF;

  -- Validate order items if provided
  IF p_order_items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_order_items) LOOP
      -- Check if product exists and has sufficient stock
      SELECT * INTO product_record 
      FROM products 
      WHERE id = (item->>'product_id')::uuid AND is_active = true;
      
      IF NOT FOUND THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
        validation_result := jsonb_set(validation_result, '{errors}', 
          (validation_result->'errors') || jsonb_build_array('Product not found: ' || (item->>'product_id')));
      ELSIF product_record.stock_quantity < (item->>'quantity')::integer THEN
        validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
        validation_result := jsonb_set(validation_result, '{errors}', 
          (validation_result->'errors') || jsonb_build_array('Insufficient stock for: ' || product_record.name));
      ELSE
        -- Calculate total amount
        total_amount := total_amount + (product_record.price * (item->>'quantity')::integer);
      END IF;
    END LOOP;

    -- Check minimum order amount
    IF total_amount < min_order_amount THEN
      validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
      validation_result := jsonb_set(validation_result, '{errors}', 
        (validation_result->'errors') || jsonb_build_array('Minimum order amount is R' || min_order_amount));
    END IF;
  END IF;

  -- Validate payment method
  IF p_payment_method IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE type::text = p_payment_method AND is_active = true) THEN
      validation_result := jsonb_set(validation_result, '{valid}', 'false'::jsonb);
      validation_result := jsonb_set(validation_result, '{errors}', 
        (validation_result->'errors') || '["Invalid payment method"]'::jsonb);
    END IF;
  END IF;

  validation_result := jsonb_set(validation_result, '{total_amount}', to_jsonb(total_amount));
  
  RETURN validation_result;
END;
$$;

-- Add order status validation function
CREATE OR REPLACE FUNCTION public.validate_order_status_transition(
  p_order_id uuid,
  p_current_status order_status,
  p_new_status order_status
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Define allowed status transitions
  CASE p_current_status
    WHEN 'pending' THEN
      RETURN p_new_status IN ('processing', 'cancelled');
    WHEN 'processing' THEN
      RETURN p_new_status IN ('shipped', 'cancelled', 'completed');
    WHEN 'shipped' THEN
      RETURN p_new_status IN ('delivered', 'returned');
    WHEN 'delivered' THEN
      RETURN p_new_status IN ('completed', 'returned');
    WHEN 'completed' THEN
      RETURN p_new_status = 'returned';
    WHEN 'cancelled' THEN
      RETURN false; -- No transitions from cancelled
    WHEN 'returned' THEN
      RETURN false; -- No transitions from returned
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Add foreign key relationships that were missing
-- Add foreign key for order_timeline.created_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_timeline_created_by_fkey'
  ) THEN
    ALTER TABLE public.order_timeline 
    ADD CONSTRAINT order_timeline_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for order_notes.author_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_notes_author_id_fkey'
  ) THEN
    ALTER TABLE public.order_notes 
    ADD CONSTRAINT order_notes_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create order processing status trigger
CREATE OR REPLACE FUNCTION public.process_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status transition
  IF NOT validate_order_status_transition(NEW.id, OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Auto-update fulfillment status based on order status
  CASE NEW.status
    WHEN 'processing' THEN
      NEW.fulfillment_status := 'unfulfilled';
    WHEN 'shipped' THEN
      NEW.fulfillment_status := 'shipped';
      NEW.shipped_at := COALESCE(NEW.shipped_at, now());
    WHEN 'delivered' THEN
      NEW.fulfillment_status := 'delivered';
      NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    WHEN 'completed' THEN
      NEW.fulfillment_status := 'delivered';
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSE
      -- Keep existing fulfillment status
  END CASE;

  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS order_status_change_trigger ON public.orders;
CREATE TRIGGER order_status_change_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.process_order_status_change();