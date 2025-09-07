-- Insert sample reviews for demonstration
DO $$
DECLARE
  product_rec RECORD;
  sample_products UUID[];
  review_count INTEGER := 0;
BEGIN
  -- Get up to 10 active products
  FOR product_rec IN 
    SELECT id FROM public.products 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    sample_products := array_append(sample_products, product_rec.id);
  END LOOP;

  -- Insert sample reviews for each product
  FOR i IN 1..array_length(sample_products, 1) LOOP
    -- Review 1 - Excellent (5 stars)
    INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
    VALUES (
      sample_products[i],
      gen_random_uuid(), -- Simulated user ID
      5,
      'Excellent product!',
      'Really happy with this purchase. Great quality and fast delivery. Would definitely recommend to others.',
      true
    ) ON CONFLICT DO NOTHING;

    -- Review 2 - Good (4 stars)
    INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
    VALUES (
      sample_products[i],
      gen_random_uuid(), -- Simulated user ID
      4,
      'Good value for money',
      'Solid product overall. Meets expectations and the price point is fair. Took a bit longer to arrive than expected but worth the wait.',
      true
    ) ON CONFLICT DO NOTHING;

    -- Review 3 - Great (5 stars)
    INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
    VALUES (
      sample_products[i],
      gen_random_uuid(), -- Simulated user ID
      5,
      'Love it!',
      'Exactly what I was looking for. Great service and quick delivery!',
      true
    ) ON CONFLICT DO NOTHING;

    -- Review 4 - Average (3 stars) for some variety
    IF i <= 5 THEN -- Only add for first 5 products
      INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
      VALUES (
        sample_products[i],
        gen_random_uuid(), -- Simulated user ID
        3,
        'It''s okay',
        'Product is decent but nothing special. Does what it''s supposed to do.',
        true
      ) ON CONFLICT DO NOTHING;
    END IF;

    review_count := review_count + 1;
  END LOOP;

  RAISE NOTICE 'Created sample reviews for % products', review_count;
END $$;