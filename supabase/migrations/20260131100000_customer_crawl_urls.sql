-- Customer Website Crawl URLs Feature
-- Allows customers with permission to submit URLs for daily crawling
-- Crawled data is sent to their assigned voice assistant
-- Follows the same pattern as customer_contributed_content (FAQ system)

-- ============================================================================
-- PHASE 1: Add Permission Type
-- ============================================================================

INSERT INTO public.portal_permission_types (id, category, name, description, agent_type) VALUES
  ('contribute_crawl_url', 'content', 'Contribute Website URLs', 'Can submit website URLs to be crawled daily for voice assistant knowledge', 'voice')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHASE 2: Customer Crawl URLs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_crawl_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer who submitted
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Target voice assistant
  assistant_id TEXT NOT NULL REFERENCES public.voice_assistants(id) ON DELETE CASCADE,

  -- URL configuration
  url TEXT NOT NULL,
  crawl_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (crawl_frequency IN ('daily', 'weekly', 'monthly')),

  -- Optional metadata
  description TEXT,  -- Customer's note about what this URL contains

  -- Workflow status (same pattern as customer_contributed_content)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'paused')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Crawl tracking
  last_crawled_at TIMESTAMPTZ,
  last_crawl_status TEXT CHECK (last_crawl_status IN ('success', 'failed', 'pending')),
  last_crawl_error TEXT,
  crawl_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate URLs for same customer+assistant
  CONSTRAINT unique_customer_assistant_url UNIQUE (customer_id, assistant_id, url)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ccu_customer ON public.customer_crawl_urls(customer_id);
CREATE INDEX IF NOT EXISTS idx_ccu_assistant ON public.customer_crawl_urls(assistant_id);
CREATE INDEX IF NOT EXISTS idx_ccu_status ON public.customer_crawl_urls(status);
CREATE INDEX IF NOT EXISTS idx_ccu_active_crawl ON public.customer_crawl_urls(status, crawl_frequency) WHERE status = 'active';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_crawl_urls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_crawl_urls_updated_at ON public.customer_crawl_urls;
CREATE TRIGGER trigger_update_crawl_urls_updated_at
BEFORE UPDATE ON public.customer_crawl_urls
FOR EACH ROW EXECUTE FUNCTION public.update_crawl_urls_updated_at();

-- ============================================================================
-- PHASE 3: Crawled Content Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_crawl_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  crawl_url_id UUID NOT NULL REFERENCES public.customer_crawl_urls(id) ON DELETE CASCADE,

  -- Crawl result
  crawled_content TEXT,  -- The extracted text content
  content_hash TEXT,     -- Hash to detect changes
  page_title TEXT,

  -- Metadata
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_length INTEGER,

  -- Whether this content was sent to the assistant
  sent_to_assistant BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ccr_crawl_url ON public.customer_crawl_results(crawl_url_id);
CREATE INDEX IF NOT EXISTS idx_ccr_crawled_at ON public.customer_crawl_results(crawled_at DESC);

-- ============================================================================
-- PHASE 4: RLS Policies (Following same pattern as customer_contributed_content)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.customer_crawl_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_crawl_results ENABLE ROW LEVEL SECURITY;

-- Customer Crawl URLs: Customers can view their own
DROP POLICY IF EXISTS "Customers can view their crawl urls" ON public.customer_crawl_urls;
CREATE POLICY "Customers can view their crawl urls"
ON public.customer_crawl_urls FOR SELECT
USING (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
);

-- Customer Crawl URLs: Customers can create when permitted
DROP POLICY IF EXISTS "Customers can create crawl urls when permitted" ON public.customer_crawl_urls;
CREATE POLICY "Customers can create crawl urls when permitted"
ON public.customer_crawl_urls FOR INSERT
WITH CHECK (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
  AND EXISTS (
    SELECT 1 FROM public.customer_assistant_assignments caa
    JOIN public.customer_portal_permissions cpp ON cpp.assistant_assignment_id = caa.id
    JOIN public.customers c ON c.id = caa.customer_id
    WHERE caa.assistant_id = customer_crawl_urls.assistant_id
    AND c.email = auth.email()
    AND cpp.permission_type_id = 'contribute_crawl_url'
    AND cpp.is_enabled = true
  )
);

-- Customer Crawl URLs: Customers can update pending
DROP POLICY IF EXISTS "Customers can update pending crawl urls" ON public.customer_crawl_urls;
CREATE POLICY "Customers can update pending crawl urls"
ON public.customer_crawl_urls FOR UPDATE
USING (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
  AND status = 'pending'
);

-- Customer Crawl URLs: Customers can delete pending
DROP POLICY IF EXISTS "Customers can delete pending crawl urls" ON public.customer_crawl_urls;
CREATE POLICY "Customers can delete pending crawl urls"
ON public.customer_crawl_urls FOR DELETE
USING (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
  AND status = 'pending'
);

-- Customer Crawl URLs: Business owners can manage all for their assistants
DROP POLICY IF EXISTS "Owners can manage crawl urls" ON public.customer_crawl_urls;
CREATE POLICY "Owners can manage crawl urls"
ON public.customer_crawl_urls FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.voice_assistants va
    WHERE va.id = customer_crawl_urls.assistant_id
    AND va.user_id = auth.uid()
  )
);

-- Customer Crawl URLs: Team members can manage for teammates' assistants
DROP POLICY IF EXISTS "Team members can manage crawl urls" ON public.customer_crawl_urls;
CREATE POLICY "Team members can manage crawl urls"
ON public.customer_crawl_urls FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.voice_assistants va
    WHERE va.id = customer_crawl_urls.assistant_id
    AND va.user_id IN (SELECT get_direct_teammates(auth.uid()))
  )
);

-- Customer Crawl Results: Customers can view results for their URLs
DROP POLICY IF EXISTS "Customers can view their crawl results" ON public.customer_crawl_results;
CREATE POLICY "Customers can view their crawl results"
ON public.customer_crawl_results FOR SELECT
USING (
  crawl_url_id IN (
    SELECT ccu.id FROM public.customer_crawl_urls ccu
    JOIN public.customers c ON c.id = ccu.customer_id
    WHERE c.email = auth.email()
  )
);

-- Customer Crawl Results: Business owners can view/manage all for their assistants
DROP POLICY IF EXISTS "Owners can manage crawl results" ON public.customer_crawl_results;
CREATE POLICY "Owners can manage crawl results"
ON public.customer_crawl_results FOR ALL
USING (
  crawl_url_id IN (
    SELECT ccu.id FROM public.customer_crawl_urls ccu
    JOIN public.voice_assistants va ON va.id = ccu.assistant_id
    WHERE va.user_id = auth.uid()
  )
);

-- Customer Crawl Results: Team members can manage for teammates' assistants
DROP POLICY IF EXISTS "Team members can manage crawl results" ON public.customer_crawl_results;
CREATE POLICY "Team members can manage crawl results"
ON public.customer_crawl_results FOR ALL
USING (
  crawl_url_id IN (
    SELECT ccu.id FROM public.customer_crawl_urls ccu
    JOIN public.voice_assistants va ON va.id = ccu.assistant_id
    WHERE va.user_id IN (SELECT get_direct_teammates(auth.uid()))
  )
);

-- ============================================================================
-- PHASE 5: Helper Function for Permission Check
-- ============================================================================

-- Check if customer can contribute crawl URLs for a voice assistant
CREATE OR REPLACE FUNCTION public.customer_can_contribute_crawl_url(
  p_customer_id UUID,
  p_assistant_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.customer_portal_permissions cpp
    JOIN public.customer_assistant_assignments caa ON caa.id = cpp.assistant_assignment_id
    WHERE caa.customer_id = p_customer_id
    AND caa.assistant_id = p_assistant_id
    AND cpp.permission_type_id = 'contribute_crawl_url'
    AND cpp.is_enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
