-- Check products without categories and update them
-- First, let's see how many products don't have a category
DO $$
DECLARE
    uncategorized_count INTEGER;
    uncategorized_category_id UUID;
BEGIN
    -- Count products without categories
    SELECT COUNT(*) INTO uncategorized_count 
    FROM products 
    WHERE category_id IS NULL;
    
    RAISE NOTICE 'Found % products without categories', uncategorized_count;
    
    IF uncategorized_count > 0 THEN
        -- Create or get "Uncategorized" category
        INSERT INTO categories (name, slug, is_active) 
        VALUES ('Uncategorized', 'uncategorized', true)
        ON CONFLICT (slug) DO UPDATE SET 
            name = EXCLUDED.name,
            is_active = EXCLUDED.is_active
        RETURNING id INTO uncategorized_category_id;
        
        -- Update products without categories
        UPDATE products 
        SET category_id = uncategorized_category_id
        WHERE category_id IS NULL;
        
        RAISE NOTICE 'Updated % products to Uncategorized category', uncategorized_count;
    END IF;
    
    -- Now let's try to auto-categorize some products based on their names
    -- Electronics category
    INSERT INTO categories (name, slug, is_active) 
    VALUES ('Electronics', 'electronics', true)
    ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active;
    
    -- Home & Garden category  
    INSERT INTO categories (name, slug, is_active) 
    VALUES ('Home & Garden', 'home-garden', true)
    ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active;
    
    -- Clothing category
    INSERT INTO categories (name, slug, is_active) 
    VALUES ('Clothing', 'clothing', true)
    ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active;
    
    -- Sports & Fitness category
    INSERT INTO categories (name, slug, is_active) 
    VALUES ('Sports & Fitness', 'sports-fitness', true)
    ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        is_active = EXCLUDED.is_active;
END $$;