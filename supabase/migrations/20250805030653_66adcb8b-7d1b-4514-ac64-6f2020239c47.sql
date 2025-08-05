-- Update the bulk_insert_products function to handle duplicate SKUs with update option
CREATE OR REPLACE FUNCTION public.bulk_insert_products(products_data jsonb, import_id_param uuid, update_duplicates boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
          -- Extract stock quantity from various possible field names
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
          
          -- Update updated count
          result := jsonb_set(result, '{updated}', (COALESCE((result->>'updated')::INTEGER, 0) + 1)::TEXT::JSONB);
          result := jsonb_set(result, '{successful}', (COALESCE((result->>'successful')::INTEGER, 0) + 1)::TEXT::JSONB);
        ELSE
          -- Skip duplicate and count as error
          RAISE EXCEPTION 'SKU already exists: %', sku_val;
        END IF;
      ELSE
        -- Insert new product
        -- Generate slug from name
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
        
        -- Extract stock quantity from various possible field names
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
        
        -- Update successful count
        result := jsonb_set(result, '{successful}', (COALESCE((result->>'successful')::INTEGER, 0) + 1)::TEXT::JSONB);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_msg := SQLERRM;
      
      -- Log error
      INSERT INTO public.product_import_errors (import_id, row_number, error_message, row_data)
      VALUES (import_id_param, row_num, error_msg, product_item);
      
      -- Update failed count and add error to result
      result := jsonb_set(result, '{failed}', (COALESCE((result->>'failed')::INTEGER, 0) + 1)::TEXT::JSONB);
      result := jsonb_set(result, '{errors}', 
        COALESCE(result->'errors', '[]'::JSONB) || jsonb_build_object('row', row_num, 'error', error_msg)
      );
    END;
  END LOOP;
  
  RETURN result;
END;
$function$