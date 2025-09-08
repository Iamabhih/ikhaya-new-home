-- Insert sample reviews using existing users and products
INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase) VALUES
-- Product 1 reviews
('8d77bba8-417d-4a8b-bb0e-7d0f11b217fc', '7d9f2f63-f9ae-4797-90f0-c1d2c39ecb5a', 5, 'Excellent product!', 'Really happy with this purchase. Great quality and fast delivery. Would definitely recommend to others.', true),
('8d77bba8-417d-4a8b-bb0e-7d0f11b217fc', '3cc95972-bfe9-46db-806c-ec528654d315', 4, 'Good value for money', 'Solid product overall. Meets expectations and the price point is fair. Took a bit longer to arrive than expected but worth the wait.', true),

-- Product 2 reviews  
('a7593bf4-c414-46bf-b3a7-04d020b61d42', 'b445c169-37f7-4058-bace-763343eb5590', 5, 'Love it!', 'Exactly what I was looking for. Great service and quick delivery!', true),
('a7593bf4-c414-46bf-b3a7-04d020b61d42', '7d9f2f63-f9ae-4797-90f0-c1d2c39ecb5a', 4, 'Happy customer', 'Good quality product. Works as described and arrived on time.', true),

-- Product 3 reviews
('e632c630-0062-4b7c-b02d-a025eef3446b', '3cc95972-bfe9-46db-806c-ec528654d315', 5, 'Outstanding quality', 'This exceeded my expectations. The build quality is excellent and it works perfectly.', true),
('e632c630-0062-4b7c-b02d-a025eef3446b', 'b445c169-37f7-4058-bace-763343eb5590', 3, 'It''s okay', 'Product is decent but nothing special. Does what it''s supposed to do.', false),

-- Product 4 reviews
('ddcc8d49-0a4a-4e8f-b3e1-d2f7305fef3f', '7d9f2f63-f9ae-4797-90f0-c1d2c39ecb5a', 4, 'Satisfied with purchase', 'Good product overall. Fast shipping and well packaged.', true),
('ddcc8d49-0a4a-4e8f-b3e1-d2f7305fef3f', '3cc95972-bfe9-46db-806c-ec528654d315', 5, 'Perfect!', 'Everything I hoped for and more. Will definitely buy again.', true),

-- Product 5 reviews
('dfaf9d64-8e31-4333-ad39-87c04c8a0fdc', 'b445c169-37f7-4058-bace-763343eb5590', 4, 'Great find', 'Really pleased with this purchase. Good quality and reasonable price.', true),
('dfaf9d64-8e31-4333-ad39-87c04c8a0fdc', '7d9f2f63-f9ae-4797-90f0-c1d2c39ecb5a', 5, 'Highly recommend', 'Fantastic product! Works exactly as advertised and arrived quickly.', true)
ON CONFLICT DO NOTHING;