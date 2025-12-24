-- Batch 2: Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    pros TEXT[],
    cons TEXT[],
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    admin_response TEXT,
    admin_response_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews FOR SELECT
USING (is_approved = true);

CREATE POLICY "Users can create reviews"
ON public.product_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
ON public.product_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.product_reviews FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON public.product_reviews(is_approved) WHERE is_approved = true;