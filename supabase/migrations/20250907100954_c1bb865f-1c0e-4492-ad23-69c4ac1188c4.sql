-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id) -- One review per user per product
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view approved reviews"
ON public.reviews
FOR SELECT
USING (is_approved = true);

CREATE POLICY "Users can create their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updating timestamps
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update product ratings when reviews change
CREATE TRIGGER update_product_rating_on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_rating();

-- Insert sample reviews for demonstration
-- First, let's get some product IDs and create some sample user profiles for the reviews
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
    -- Review 1 - Excellent
    INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
    VALUES (
      sample_products[i],
      gen_random_uuid(), -- Simulated user ID
      5,
      'Excellent product!',
      'Really happy with this purchase. Great quality and fast delivery. Would definitely recommend to others.',
      true
    );

    -- Review 2 - Good with some feedback
    INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
    VALUES (
      sample_products[i],
      gen_random_uuid(), -- Simulated user ID
      4,
      'Good value for money',
      'Solid product overall. Meets expectations and the price point is fair. Took a bit longer to arrive than expected but worth the wait.',
      true
    );

    -- Review 3 - Brief positive
    IF random() > 0.3 THEN -- Only add third review 70% of the time
      INSERT INTO public.reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
      VALUES (
        sample_products[i],
        gen_random_uuid(), -- Simulated user ID
        CASE WHEN random() > 0.7 THEN 5 ELSE 4 END,
        CASE WHEN random() > 0.5 THEN 'Love it!' ELSE 'Happy customer' END,
        CASE 
          WHEN random() > 0.6 THEN 'Exactly what I was looking for. Great service!'
          ELSE 'Quick delivery and good packaging. Satisfied with the purchase.'
        END,
        random() > 0.2 -- 80% verified purchases
      );
    END IF;

    review_count := review_count + 1;
  END LOOP;

  RAISE NOTICE 'Created sample reviews for % products', review_count;
END $$;