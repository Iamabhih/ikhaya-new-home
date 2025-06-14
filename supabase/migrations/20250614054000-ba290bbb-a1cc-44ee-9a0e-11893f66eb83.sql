
-- Create product_imports table to track import sessions
CREATE TABLE public.product_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  import_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create product_import_errors table to track individual row errors
CREATE TABLE public.product_import_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID REFERENCES public.product_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  row_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for product_imports
ALTER TABLE public.product_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imports" 
  ON public.product_imports 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own imports" 
  ON public.product_imports 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imports" 
  ON public.product_imports 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add RLS policies for product_import_errors
ALTER TABLE public.product_import_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import errors" 
  ON public.product_import_errors 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.product_imports 
      WHERE id = import_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create import errors for their imports" 
  ON public.product_import_errors 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_imports 
      WHERE id = import_id AND user_id = auth.uid()
    )
  );

-- Create function to generate unique SKU if not provided
CREATE OR REPLACE FUNCTION public.generate_unique_sku(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create function for bulk product insert with validation
CREATE OR REPLACE FUNCTION public.bulk_insert_products(
  products_data JSONB,
  import_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_item JSONB;
  category_id_val UUID;
  sku_val TEXT;
  slug_val TEXT;
  result JSONB := '{"successful": 0, "failed": 0, "errors": []}'::JSONB;
  error_msg TEXT;
  row_num INTEGER := 0;
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
      
      -- Check for duplicate SKU
      IF EXISTS (SELECT 1 FROM public.products WHERE sku = sku_val) THEN
        RAISE EXCEPTION 'SKU already exists: %', sku_val;
      END IF;
      
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
      
      -- Insert product
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
        COALESCE((product_item->>'stock_quantity')::INTEGER, 0),
        COALESCE((product_item->>'is_active')::BOOLEAN, true),
        COALESCE((product_item->>'is_featured')::BOOLEAN, false)
      );
      
      -- Update successful count
      result := jsonb_set(result, '{successful}', (COALESCE((result->>'successful')::INTEGER, 0) + 1)::TEXT::JSONB);
      
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
$$;
