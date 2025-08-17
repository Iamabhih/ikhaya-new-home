-- Phase 1: Database Schema Enhancement
-- Add new fields to product_images table
ALTER TABLE product_images 
ADD COLUMN image_status TEXT DEFAULT 'active' CHECK (image_status IN ('draft', 'active', 'archived')),
ADD COLUMN match_confidence NUMERIC DEFAULT 100.0 CHECK (match_confidence >= 0 AND match_confidence <= 100),
ADD COLUMN match_metadata JSONB DEFAULT '{}',
ADD COLUMN auto_matched BOOLEAN DEFAULT false,
ADD COLUMN reviewed_by UUID,
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create product_image_candidates table for potential matches
CREATE TABLE product_image_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    match_confidence NUMERIC NOT NULL DEFAULT 0 CHECK (match_confidence >= 0 AND match_confidence <= 100),
    match_metadata JSONB DEFAULT '{}',
    extracted_sku TEXT,
    source_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_product_image_candidates_product_id ON product_image_candidates(product_id);
CREATE INDEX idx_product_image_candidates_status ON product_image_candidates(status);
CREATE INDEX idx_product_image_candidates_confidence ON product_image_candidates(match_confidence DESC);
CREATE INDEX idx_product_images_status ON product_images(image_status);
CREATE INDEX idx_product_images_auto_matched ON product_images(auto_matched);

-- Enable RLS on product_image_candidates
ALTER TABLE product_image_candidates ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_image_candidates
CREATE POLICY "Admins can manage product image candidates" 
ON product_image_candidates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Anyone can view approved product image candidates" 
ON product_image_candidates 
FOR SELECT 
USING (status = 'approved');

-- Create function to promote candidate to active image
CREATE OR REPLACE FUNCTION promote_image_candidate(candidate_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to reject candidate
CREATE OR REPLACE FUNCTION reject_image_candidate(candidate_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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