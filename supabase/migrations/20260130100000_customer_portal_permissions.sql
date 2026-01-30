-- Customer Portal Permissions System
-- Allows business owners to configure what customers can see/edit in their portal

-- ============================================================================
-- PHASE 1: Permission Types (Reference Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portal_permission_types (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('view', 'edit', 'content')),
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('voice', 'chatbot', 'whatsapp', 'all')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed permission types
INSERT INTO public.portal_permission_types (id, category, name, description, agent_type) VALUES
  -- View permissions
  ('view_calls', 'view', 'View Call Logs', 'Can view call history and recordings', 'voice'),
  ('view_transcripts', 'view', 'View Transcripts', 'Can view call transcripts', 'voice'),
  ('view_analytics', 'view', 'View Analytics', 'Can view performance analytics', 'all'),
  ('view_conversations', 'view', 'View Conversations', 'Can view conversation history', 'chatbot'),
  ('view_whatsapp_messages', 'view', 'View WhatsApp Messages', 'Can view WhatsApp conversation logs', 'whatsapp'),
  ('view_leads', 'view', 'View Leads', 'Can view captured leads', 'all'),
  -- Content permissions
  ('contribute_faq', 'content', 'Contribute FAQs', 'Can submit FAQs to be added to system prompt', 'voice')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PHASE 2: Customer Portal Permissions (Per-Assignment)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_portal_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One of these will be set based on assignment type
  chatbot_assignment_id UUID REFERENCES public.customer_chatbot_assignments(id) ON DELETE CASCADE,
  assistant_assignment_id UUID REFERENCES public.customer_assistant_assignments(id) ON DELETE CASCADE,
  whatsapp_assignment_id UUID REFERENCES public.customer_whatsapp_agent_assignments(id) ON DELETE CASCADE,

  permission_type_id TEXT NOT NULL REFERENCES public.portal_permission_types(id),
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraints per assignment type
  CONSTRAINT unique_chatbot_permission UNIQUE (chatbot_assignment_id, permission_type_id),
  CONSTRAINT unique_assistant_permission UNIQUE (assistant_assignment_id, permission_type_id),
  CONSTRAINT unique_whatsapp_permission UNIQUE (whatsapp_assignment_id, permission_type_id),

  -- Ensure exactly one assignment reference is set
  CONSTRAINT single_assignment_reference CHECK (
    (CASE WHEN chatbot_assignment_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN assistant_assignment_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN whatsapp_assignment_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cpp_chatbot_assignment ON public.customer_portal_permissions(chatbot_assignment_id) WHERE chatbot_assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpp_assistant_assignment ON public.customer_portal_permissions(assistant_assignment_id) WHERE assistant_assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cpp_whatsapp_assignment ON public.customer_portal_permissions(whatsapp_assignment_id) WHERE whatsapp_assignment_id IS NOT NULL;

-- ============================================================================
-- PHASE 3: Customer Contributed Content (FAQs, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_contributed_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer who contributed
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Target agent (one will be set)
  assistant_id TEXT REFERENCES public.voice_assistants(id) ON DELETE CASCADE,
  chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE CASCADE,

  -- Content type and data
  content_type TEXT NOT NULL CHECK (content_type IN ('faq', 'knowledge', 'instruction')),
  title TEXT,           -- For FAQ: the question
  content TEXT NOT NULL, -- For FAQ: the answer

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure exactly one agent reference is set
  CONSTRAINT single_agent_reference CHECK (
    (CASE WHEN assistant_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN chatbot_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ccc_customer ON public.customer_contributed_content(customer_id);
CREATE INDEX IF NOT EXISTS idx_ccc_assistant ON public.customer_contributed_content(assistant_id) WHERE assistant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ccc_chatbot ON public.customer_contributed_content(chatbot_id) WHERE chatbot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ccc_status ON public.customer_contributed_content(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_contributed_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contributed_content_updated_at ON public.customer_contributed_content;
CREATE TRIGGER trigger_update_contributed_content_updated_at
BEFORE UPDATE ON public.customer_contributed_content
FOR EACH ROW EXECUTE FUNCTION public.update_contributed_content_updated_at();

-- ============================================================================
-- PHASE 4: RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.portal_permission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contributed_content ENABLE ROW LEVEL SECURITY;

-- Permission Types: Anyone authenticated can read (reference data)
DROP POLICY IF EXISTS "Anyone can read permission types" ON public.portal_permission_types;
CREATE POLICY "Anyone can read permission types"
ON public.portal_permission_types FOR SELECT
TO authenticated
USING (true);

-- Customer Portal Permissions: Customers can view their own
DROP POLICY IF EXISTS "Customers can view their permissions" ON public.customer_portal_permissions;
CREATE POLICY "Customers can view their permissions"
ON public.customer_portal_permissions FOR SELECT
USING (
  -- Voice assistant assignments
  (assistant_assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_assistant_assignments caa
    JOIN public.customers c ON c.id = caa.customer_id
    WHERE caa.id = customer_portal_permissions.assistant_assignment_id
    AND c.email = auth.email()
  ))
  OR
  -- Chatbot assignments
  (chatbot_assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_chatbot_assignments cca
    JOIN public.customers c ON c.id = cca.customer_id
    WHERE cca.id = customer_portal_permissions.chatbot_assignment_id
    AND c.email = auth.email()
  ))
  OR
  -- WhatsApp assignments
  (whatsapp_assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_whatsapp_agent_assignments cwaa
    JOIN public.customers c ON c.id = cwaa.customer_id
    WHERE cwaa.id = customer_portal_permissions.whatsapp_assignment_id
    AND c.email = auth.email()
  ))
);

-- Customer Portal Permissions: Business owners can manage
DROP POLICY IF EXISTS "Owners can manage permissions" ON public.customer_portal_permissions;
CREATE POLICY "Owners can manage permissions"
ON public.customer_portal_permissions FOR ALL
USING (
  auth.uid() = granted_by
  OR
  -- Voice assistant owner
  (assistant_assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_assistant_assignments caa
    JOIN public.voice_assistants va ON va.id = caa.assistant_id
    WHERE caa.id = customer_portal_permissions.assistant_assignment_id
    AND va.user_id = auth.uid()
  ))
  OR
  -- Chatbot owner
  (chatbot_assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_chatbot_assignments cca
    JOIN public.chatbots cb ON cb.id = cca.chatbot_id
    WHERE cca.id = customer_portal_permissions.chatbot_assignment_id
    AND cb.user_id = auth.uid()
  ))
  OR
  -- WhatsApp agent owner
  (whatsapp_assignment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.customer_whatsapp_agent_assignments cwaa
    JOIN public.whatsapp_agents wa ON wa.id = cwaa.agent_id
    WHERE cwaa.id = customer_portal_permissions.whatsapp_assignment_id
    AND wa.user_id = auth.uid()
  ))
);

-- Customer Contributed Content: Customers can view their own
DROP POLICY IF EXISTS "Customers can view their content" ON public.customer_contributed_content;
CREATE POLICY "Customers can view their content"
ON public.customer_contributed_content FOR SELECT
USING (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
);

-- Customer Contributed Content: Customers can create when permitted
DROP POLICY IF EXISTS "Customers can create content when permitted" ON public.customer_contributed_content;
CREATE POLICY "Customers can create content when permitted"
ON public.customer_contributed_content FOR INSERT
WITH CHECK (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
  AND (
    -- Voice assistant FAQ permission
    (assistant_id IS NOT NULL AND content_type = 'faq' AND EXISTS (
      SELECT 1 FROM public.customer_assistant_assignments caa
      JOIN public.customer_portal_permissions cpp ON cpp.assistant_assignment_id = caa.id
      JOIN public.customers c ON c.id = caa.customer_id
      WHERE caa.assistant_id = customer_contributed_content.assistant_id
      AND c.email = auth.email()
      AND cpp.permission_type_id = 'contribute_faq'
      AND cpp.is_enabled = true
    ))
    OR
    -- Chatbot knowledge permission
    (chatbot_id IS NOT NULL AND content_type IN ('faq', 'knowledge') AND EXISTS (
      SELECT 1 FROM public.customer_chatbot_assignments cca
      JOIN public.customer_portal_permissions cpp ON cpp.chatbot_assignment_id = cca.id
      JOIN public.customers c ON c.id = cca.customer_id
      WHERE cca.chatbot_id = customer_contributed_content.chatbot_id
      AND c.email = auth.email()
      AND cpp.permission_type_id IN ('contribute_faq', 'contribute_knowledge')
      AND cpp.is_enabled = true
    ))
  )
);

-- Customer Contributed Content: Customers can update pending
DROP POLICY IF EXISTS "Customers can update pending content" ON public.customer_contributed_content;
CREATE POLICY "Customers can update pending content"
ON public.customer_contributed_content FOR UPDATE
USING (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
  AND status = 'pending'
);

-- Customer Contributed Content: Customers can delete pending
DROP POLICY IF EXISTS "Customers can delete pending content" ON public.customer_contributed_content;
CREATE POLICY "Customers can delete pending content"
ON public.customer_contributed_content FOR DELETE
USING (
  customer_id IN (SELECT c.id FROM public.customers c WHERE c.email = auth.email())
  AND status = 'pending'
);

-- Customer Contributed Content: Business owners can manage all for their agents
DROP POLICY IF EXISTS "Owners can manage content" ON public.customer_contributed_content;
CREATE POLICY "Owners can manage content"
ON public.customer_contributed_content FOR ALL
USING (
  (assistant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.voice_assistants va
    WHERE va.id = customer_contributed_content.assistant_id
    AND va.user_id = auth.uid()
  ))
  OR
  (chatbot_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chatbots cb
    WHERE cb.id = customer_contributed_content.chatbot_id
    AND cb.user_id = auth.uid()
  ))
);

-- ============================================================================
-- PHASE 5: Helper Functions
-- ============================================================================

-- Check if customer has a specific permission
CREATE OR REPLACE FUNCTION public.customer_has_permission(
  p_customer_id UUID,
  p_permission_type_id TEXT,
  p_assistant_id TEXT DEFAULT NULL,
  p_chatbot_id UUID DEFAULT NULL,
  p_whatsapp_agent_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check voice assistant permission
  IF p_assistant_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.customer_portal_permissions cpp
      JOIN public.customer_assistant_assignments caa ON caa.id = cpp.assistant_assignment_id
      WHERE caa.customer_id = p_customer_id
      AND caa.assistant_id = p_assistant_id
      AND cpp.permission_type_id = p_permission_type_id
      AND cpp.is_enabled = true
    );
  END IF;

  -- Check chatbot permission
  IF p_chatbot_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.customer_portal_permissions cpp
      JOIN public.customer_chatbot_assignments cca ON cca.id = cpp.chatbot_assignment_id
      WHERE cca.customer_id = p_customer_id
      AND cca.chatbot_id = p_chatbot_id
      AND cpp.permission_type_id = p_permission_type_id
      AND cpp.is_enabled = true
    );
  END IF;

  -- Check WhatsApp agent permission
  IF p_whatsapp_agent_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.customer_portal_permissions cpp
      JOIN public.customer_whatsapp_agent_assignments cwaa ON cwaa.id = cpp.whatsapp_assignment_id
      WHERE cwaa.customer_id = p_customer_id
      AND cwaa.agent_id = p_whatsapp_agent_id
      AND cpp.permission_type_id = p_permission_type_id
      AND cpp.is_enabled = true
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================================
-- PHASE 6: Default Permissions Triggers (Backward Compatibility)
-- ============================================================================

-- Grant default view permissions for new voice assistant assignments
CREATE OR REPLACE FUNCTION public.grant_default_permissions_voice()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_portal_permissions
    (assistant_assignment_id, permission_type_id, is_enabled, granted_by)
  VALUES
    (NEW.id, 'view_calls', true, NEW.assigned_by),
    (NEW.id, 'view_transcripts', true, NEW.assigned_by),
    (NEW.id, 'view_analytics', true, NEW.assigned_by),
    (NEW.id, 'view_leads', true, NEW.assigned_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_default_permissions_voice ON public.customer_assistant_assignments;
CREATE TRIGGER trigger_grant_default_permissions_voice
AFTER INSERT ON public.customer_assistant_assignments
FOR EACH ROW EXECUTE FUNCTION public.grant_default_permissions_voice();

-- Grant default view permissions for new chatbot assignments
CREATE OR REPLACE FUNCTION public.grant_default_permissions_chatbot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_portal_permissions
    (chatbot_assignment_id, permission_type_id, is_enabled, granted_by)
  VALUES
    (NEW.id, 'view_conversations', true, NEW.assigned_by),
    (NEW.id, 'view_analytics', true, NEW.assigned_by),
    (NEW.id, 'view_leads', true, NEW.assigned_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_default_permissions_chatbot ON public.customer_chatbot_assignments;
CREATE TRIGGER trigger_grant_default_permissions_chatbot
AFTER INSERT ON public.customer_chatbot_assignments
FOR EACH ROW EXECUTE FUNCTION public.grant_default_permissions_chatbot();

-- Grant default view permissions for new WhatsApp assignments
CREATE OR REPLACE FUNCTION public.grant_default_permissions_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_portal_permissions
    (whatsapp_assignment_id, permission_type_id, is_enabled, granted_by)
  VALUES
    (NEW.id, 'view_whatsapp_messages', true, NEW.assigned_by),
    (NEW.id, 'view_analytics', true, NEW.assigned_by),
    (NEW.id, 'view_leads', true, NEW.assigned_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_default_permissions_whatsapp ON public.customer_whatsapp_agent_assignments;
CREATE TRIGGER trigger_grant_default_permissions_whatsapp
AFTER INSERT ON public.customer_whatsapp_agent_assignments
FOR EACH ROW EXECUTE FUNCTION public.grant_default_permissions_whatsapp();

-- ============================================================================
-- PHASE 7: Backfill Existing Assignments with Default Permissions
-- ============================================================================

-- Voice assistant assignments
INSERT INTO public.customer_portal_permissions (assistant_assignment_id, permission_type_id, is_enabled, granted_by)
SELECT caa.id, ppt.id, true, caa.assigned_by
FROM public.customer_assistant_assignments caa
CROSS JOIN public.portal_permission_types ppt
WHERE ppt.id IN ('view_calls', 'view_transcripts', 'view_analytics', 'view_leads')
AND ppt.agent_type IN ('voice', 'all')
ON CONFLICT DO NOTHING;

-- Chatbot assignments
INSERT INTO public.customer_portal_permissions (chatbot_assignment_id, permission_type_id, is_enabled, granted_by)
SELECT cca.id, ppt.id, true, cca.assigned_by
FROM public.customer_chatbot_assignments cca
CROSS JOIN public.portal_permission_types ppt
WHERE ppt.id IN ('view_conversations', 'view_analytics', 'view_leads')
AND ppt.agent_type IN ('chatbot', 'all')
ON CONFLICT DO NOTHING;

-- WhatsApp assignments
INSERT INTO public.customer_portal_permissions (whatsapp_assignment_id, permission_type_id, is_enabled, granted_by)
SELECT cwaa.id, ppt.id, true, cwaa.assigned_by
FROM public.customer_whatsapp_agent_assignments cwaa
CROSS JOIN public.portal_permission_types ppt
WHERE ppt.id IN ('view_whatsapp_messages', 'view_analytics', 'view_leads')
AND ppt.agent_type IN ('whatsapp', 'all')
ON CONFLICT DO NOTHING;
