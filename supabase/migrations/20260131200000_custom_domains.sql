-- Custom Domains Feature
-- Allows business admins to use custom domains for their customer portals
-- e.g., portal.theirbusiness.com instead of voxtro.io/customer-dashboard

-- ============================================================================
-- PHASE 1: Custom Domains Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner of this custom domain
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The custom domain (e.g., portal.mybusiness.com)
  domain TEXT NOT NULL,

  -- Verification status
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed')),

  -- Vercel's domain ID for management via API
  vercel_domain_id TEXT,

  -- When the domain was verified
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only have one custom domain
  CONSTRAINT one_domain_per_user UNIQUE (user_id),
  -- Each domain can only be used once
  CONSTRAINT unique_domain UNIQUE (domain)
);

-- Index for quick domain lookups
CREATE INDEX IF NOT EXISTS idx_ucd_domain ON public.user_custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_ucd_user ON public.user_custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_ucd_verified ON public.user_custom_domains(verification_status)
  WHERE verification_status = 'verified';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_custom_domains_updated_at ON public.user_custom_domains;
CREATE TRIGGER trigger_update_custom_domains_updated_at
BEFORE UPDATE ON public.user_custom_domains
FOR EACH ROW EXECUTE FUNCTION public.update_custom_domains_updated_at();

-- ============================================================================
-- PHASE 2: RLS Policies
-- ============================================================================

ALTER TABLE public.user_custom_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom domain
DROP POLICY IF EXISTS "Users can view their own custom domain" ON public.user_custom_domains;
CREATE POLICY "Users can view their own custom domain"
ON public.user_custom_domains FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own custom domain
DROP POLICY IF EXISTS "Users can create their own custom domain" ON public.user_custom_domains;
CREATE POLICY "Users can create their own custom domain"
ON public.user_custom_domains FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own custom domain
DROP POLICY IF EXISTS "Users can update their own custom domain" ON public.user_custom_domains;
CREATE POLICY "Users can update their own custom domain"
ON public.user_custom_domains FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own custom domain
DROP POLICY IF EXISTS "Users can delete their own custom domain" ON public.user_custom_domains;
CREATE POLICY "Users can delete their own custom domain"
ON public.user_custom_domains FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- PHASE 3: Public Domain Lookup Function
-- ============================================================================

-- Function to lookup branding by domain (public, used before login)
CREATE OR REPLACE FUNCTION public.get_branding_by_domain(p_domain TEXT)
RETURNS TABLE (
  user_id UUID,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ucd.user_id,
    bs.logo_url,
    COALESCE(bs.primary_color, '#f97316') as primary_color,
    COALESCE(bs.secondary_color, '#ea580c') as secondary_color
  FROM public.user_custom_domains ucd
  LEFT JOIN public.branding_settings bs ON bs.user_id = ucd.user_id
  WHERE ucd.domain = p_domain
  AND ucd.verification_status = 'verified';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant execute to anon and authenticated (needed for login page)
GRANT EXECUTE ON FUNCTION public.get_branding_by_domain(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_branding_by_domain(TEXT) TO authenticated;

-- ============================================================================
-- PHASE 4: Helper Functions
-- ============================================================================

-- Check if a domain is available (not already taken)
CREATE OR REPLACE FUNCTION public.is_domain_available(p_domain TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.user_custom_domains
    WHERE domain = p_domain
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_domain_available(TEXT) TO authenticated;

-- Get user_id by verified domain (for customer login routing)
CREATE OR REPLACE FUNCTION public.get_user_by_domain(p_domain TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.user_custom_domains
  WHERE domain = p_domain
  AND verification_status = 'verified';

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_by_domain(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_by_domain(TEXT) TO authenticated;
