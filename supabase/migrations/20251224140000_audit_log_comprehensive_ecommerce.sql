-- Comprehensive E-Commerce Audit Log
-- Date: December 24, 2025
-- Purpose: Document comprehensive audit findings and create audit tracking table
-- Reference: ECOMMERCE_COMPREHENSIVE_AUDIT.md

-- Create audit log table for tracking audits and improvements
CREATE TABLE IF NOT EXISTS public.platform_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_date DATE NOT NULL,
  audit_type TEXT NOT NULL, -- 'comprehensive', 'security', 'performance', 'feature'
  auditor TEXT NOT NULL,
  overall_score DECIMAL(3,1), -- e.g., 7.5 out of 10
  shopify_parity_score INTEGER, -- percentage vs Shopify (0-100)
  critical_issues INTEGER DEFAULT 0,
  high_priority_issues INTEGER DEFAULT 0,
  medium_priority_issues INTEGER DEFAULT 0,
  low_priority_issues INTEGER DEFAULT 0,
  findings JSONB, -- detailed findings
  recommendations JSONB, -- recommendations array
  status TEXT CHECK (status IN ('draft', 'published', 'in_progress', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for querying audits
CREATE INDEX IF NOT EXISTS idx_platform_audits_date ON public.platform_audits(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audits_type ON public.platform_audits(audit_type);

-- Insert current comprehensive audit record
INSERT INTO public.platform_audits (
  audit_date,
  audit_type,
  auditor,
  overall_score,
  shopify_parity_score,
  critical_issues,
  high_priority_issues,
  medium_priority_issues,
  low_priority_issues,
  findings,
  recommendations,
  status
) VALUES (
  '2025-12-24',
  'comprehensive',
  'Claude Code',
  7.5,
  63,
  6, -- From original AUDIT_REPORT.md
  9,
  14,
  8,
  jsonb_build_object(
    'strengths', jsonb_build_array(
      'Robust order management with timeline tracking',
      'Advanced cart abandonment recovery',
      'Real-time analytics with materialized views',
      'Wholesale/B2B quote system',
      'Multi-role user management (5 roles)',
      'Atomic transaction-wrapped order creation',
      'Comprehensive payment logging'
    ),
    'critical_gaps', jsonb_build_array(
      'No discount codes & promotions engine (60% gap)',
      'No product reviews/ratings system',
      'Limited SEO optimization features (60% gap)',
      'No multi-channel selling (80% gap)',
      'No gift cards/store credit',
      'Limited email marketing automation'
    ),
    'category_scores', jsonb_build_object(
      'product_management', 80,
      'shopping_cart', 80,
      'checkout', 60,
      'payment_processing', 60,
      'order_management', 100,
      'inventory', 60,
      'customer_management', 80,
      'shipping_fulfillment', 60,
      'marketing_promotions', 40,
      'analytics_reporting', 80,
      'seo_content', 40,
      'multichannel', 20,
      'internationalization', 40
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'priority', 'CRITICAL',
      'feature', 'Discount Codes & Promotions Engine',
      'effort', '3-4 weeks',
      'impact', 'Direct revenue increase, competitive parity'
    ),
    jsonb_build_object(
      'priority', 'CRITICAL',
      'feature', 'Product Reviews & Ratings',
      'effort', '2 weeks',
      'impact', 'Social proof, conversion rate increase, SEO'
    ),
    jsonb_build_object(
      'priority', 'CRITICAL',
      'feature', 'SEO Optimization Suite',
      'effort', '2-3 weeks',
      'impact', 'Organic traffic increase, discoverability'
    ),
    jsonb_build_object(
      'priority', 'CRITICAL',
      'feature', 'Email Marketing Automation',
      'effort', '4-5 weeks',
      'impact', 'Customer retention, repeat purchases'
    ),
    jsonb_build_object(
      'priority', 'CRITICAL',
      'feature', 'Gift Cards & Store Credit',
      'effort', '2-3 weeks',
      'impact', 'New revenue stream, customer acquisition'
    ),
    jsonb_build_object(
      'priority', 'HIGH',
      'feature', 'Product Collections (Smart & Manual)',
      'effort', '2 weeks',
      'impact', 'Product organization, merchandising'
    ),
    jsonb_build_object(
      'priority', 'HIGH',
      'feature', 'Multi-Currency Support',
      'effort', '3-4 weeks',
      'impact', 'International expansion'
    ),
    jsonb_build_object(
      'priority', 'HIGH',
      'feature', 'Social Media Integration',
      'effort', '2-3 weeks',
      'impact', 'Multi-channel sales, reach expansion'
    ),
    jsonb_build_object(
      'priority', 'HIGH',
      'feature', 'Customer Loyalty Program',
      'effort', '4-5 weeks',
      'impact', 'Customer retention, LTV increase'
    ),
    jsonb_build_object(
      'priority', 'MEDIUM',
      'feature', 'Blog/Content Management System',
      'effort', '1 week',
      'impact', 'SEO, content marketing'
    )
  ),
  'published'
);

-- Add comment
COMMENT ON TABLE public.platform_audits IS
'Tracks comprehensive platform audits comparing features against competitors like Shopify. Used for measuring improvement over time.';

-- Grant permissions
GRANT SELECT ON public.platform_audits TO authenticated;
GRANT ALL ON public.platform_audits TO service_role;

-- Create improvement tracking table
CREATE TABLE IF NOT EXISTS public.feature_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES public.platform_audits(id),
  feature_name TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  category TEXT, -- e.g., 'marketing', 'seo', 'payment'
  estimated_effort_weeks INTEGER,
  estimated_effort_hours INTEGER,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
  implementation_phase INTEGER, -- Which sprint/phase
  assigned_to TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  actual_effort_hours INTEGER,
  impact_metrics JSONB, -- Measured impact after implementation
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_improvements_status ON public.feature_improvements(status);
CREATE INDEX IF NOT EXISTS idx_feature_improvements_priority ON public.feature_improvements(priority);
CREATE INDEX IF NOT EXISTS idx_feature_improvements_phase ON public.feature_improvements(implementation_phase);

-- Insert planned improvements from audit
INSERT INTO public.feature_improvements (
  audit_id,
  feature_name,
  priority,
  category,
  estimated_effort_weeks,
  estimated_effort_hours,
  implementation_phase
)
SELECT
  (SELECT id FROM public.platform_audits WHERE audit_date = '2025-12-24' LIMIT 1),
  feature_name,
  priority,
  category,
  effort_weeks,
  effort_hours,
  phase
FROM (VALUES
  -- Phase 1: Critical Fixes (completed)
  ('PayFast IP Whitelist Verification', 'HIGH', 'security', 1, 8, 1),
  ('Refund API Integration', 'HIGH', 'payment', 1, 16, 1),
  ('Payment Rate Limiting', 'HIGH', 'security', 1, 8, 1),
  ('Pending Order Cleanup Cron', 'HIGH', 'operations', 1, 8, 1),

  -- Phase 2: Marketing Essentials
  ('Discount Codes Engine', 'CRITICAL', 'marketing', 2, 80, 2),
  ('Product Reviews & Ratings', 'CRITICAL', 'marketing', 2, 60, 2),

  -- Phase 3: SEO & Content
  ('SEO Optimization Suite', 'CRITICAL', 'seo', 2, 70, 3),
  ('Blog/CMS System', 'HIGH', 'content', 1, 40, 3),

  -- Phase 4: Advanced Features
  ('Gift Cards System', 'CRITICAL', 'marketing', 2, 60, 4),
  ('Email Marketing Automation', 'CRITICAL', 'marketing', 2, 80, 4),
  ('Product Collections', 'HIGH', 'product', 1, 40, 4),

  -- Phase 5: Scaling
  ('Multi-Currency Support', 'HIGH', 'internationalization', 2, 70, 5),
  ('Loyalty Program', 'HIGH', 'marketing', 1, 50, 5),
  ('Social Media Integration', 'HIGH', 'multichannel', 1, 40, 5),

  -- Phase 6: Advanced Operations
  ('Multi-Location Inventory', 'MEDIUM', 'inventory', 2, 80, 6),
  ('Subscription Billing', 'MEDIUM', 'payment', 1, 60, 6),
  ('Advanced Shipping Integration', 'MEDIUM', 'shipping', 1, 50, 6)
) AS improvements(feature_name, priority, category, effort_weeks, effort_hours, phase);

-- Add comments
COMMENT ON TABLE public.feature_improvements IS
'Tracks individual feature improvements from platform audits. Links to audit findings and measures implementation progress and impact.';

-- Grant permissions
GRANT SELECT ON public.feature_improvements TO authenticated;
GRANT ALL ON public.feature_improvements TO service_role;

-- Create function to update progress
CREATE OR REPLACE FUNCTION public.update_improvement_progress(
  p_feature_id UUID,
  p_status TEXT,
  p_actual_hours INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE feature_improvements
  SET
    status = p_status,
    updated_at = now(),
    started_at = CASE
      WHEN p_status = 'in_progress' AND started_at IS NULL THEN now()
      ELSE started_at
    END,
    completed_at = CASE
      WHEN p_status = 'completed' THEN now()
      ELSE completed_at
    END,
    actual_effort_hours = COALESCE(p_actual_hours, actual_effort_hours)
  WHERE id = p_feature_id;
END;
$$;

COMMENT ON FUNCTION public.update_improvement_progress IS
'Updates the status and timing of feature improvements. Automatically sets started_at and completed_at timestamps.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_improvement_progress TO service_role;

-- Create view for audit dashboard
CREATE OR REPLACE VIEW public.audit_dashboard AS
SELECT
  pa.audit_date,
  pa.audit_type,
  pa.overall_score,
  pa.shopify_parity_score,
  pa.critical_issues,
  pa.high_priority_issues,
  pa.medium_priority_issues,
  pa.low_priority_issues,
  COUNT(fi.id) FILTER (WHERE fi.status = 'completed') as features_completed,
  COUNT(fi.id) FILTER (WHERE fi.status = 'in_progress') as features_in_progress,
  COUNT(fi.id) FILTER (WHERE fi.status = 'planned') as features_planned,
  SUM(fi.actual_effort_hours) FILTER (WHERE fi.status = 'completed') as hours_invested,
  pa.status as audit_status
FROM public.platform_audits pa
LEFT JOIN public.feature_improvements fi ON fi.audit_id = pa.id
GROUP BY pa.id, pa.audit_date, pa.audit_type, pa.overall_score, pa.shopify_parity_score,
         pa.critical_issues, pa.high_priority_issues, pa.medium_priority_issues, pa.low_priority_issues, pa.status
ORDER BY pa.audit_date DESC;

COMMENT ON VIEW public.audit_dashboard IS
'Dashboard view combining audit findings with implementation progress metrics.';

-- Grant view permissions
GRANT SELECT ON public.audit_dashboard TO authenticated;

-- Log this migration
INSERT INTO public.system_change_logs (
  change_type,
  change_category,
  change_description,
  table_name,
  impact_level,
  metadata
) VALUES (
  'schema_change',
  'audit_system',
  'Created comprehensive audit tracking system with platform_audits and feature_improvements tables',
  'platform_audits, feature_improvements',
  'low',
  jsonb_build_object(
    'migration_file', '20251224140000_audit_log_comprehensive_ecommerce.sql',
    'tables_created', jsonb_build_array('platform_audits', 'feature_improvements'),
    'views_created', jsonb_build_array('audit_dashboard'),
    'functions_created', jsonb_build_array('update_improvement_progress'),
    'audit_document', 'ECOMMERCE_COMPREHENSIVE_AUDIT.md',
    'total_features_planned', 17,
    'total_estimated_hours', 860
  )
);
