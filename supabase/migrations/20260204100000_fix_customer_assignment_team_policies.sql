-- Fix customer assignment RLS policies to allow team members to assign
-- their customers to teammates' agents (chatbots, voice assistants, WhatsApp agents)
--
-- IMPORTANT: These policies use assigned_by (not agent_id -> parent table lookups)
-- to avoid infinite recursion. Parent tables (chatbots, voice_assistants, whatsapp_agents)
-- have Customer policies that query these assignment tables. If these policies query
-- the parent tables back, it creates a circular dependency.

-- ============================================
-- CHATBOT ASSIGNMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can create customer assignments" ON public.customer_chatbot_assignments;
CREATE POLICY "Users can create customer assignments" ON public.customer_chatbot_assignments
FOR INSERT TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

DROP POLICY IF EXISTS "Users can view their customer assignments" ON public.customer_chatbot_assignments;
CREATE POLICY "Users can view their customer assignments" ON public.customer_chatbot_assignments
FOR SELECT TO authenticated
USING (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete their customer assignments" ON public.customer_chatbot_assignments;
CREATE POLICY "Users can delete their customer assignments" ON public.customer_chatbot_assignments
FOR DELETE TO authenticated
USING (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

-- ============================================
-- VOICE ASSISTANT ASSIGNMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can create assistant assignments" ON public.customer_assistant_assignments;
DROP POLICY IF EXISTS "Users can view their assistant assignments" ON public.customer_assistant_assignments;
DROP POLICY IF EXISTS "Users can delete their assistant assignments" ON public.customer_assistant_assignments;

CREATE POLICY "Users can create assistant assignments" ON public.customer_assistant_assignments
FOR INSERT TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

CREATE POLICY "Users can view their assistant assignments" ON public.customer_assistant_assignments
FOR SELECT TO authenticated
USING (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

CREATE POLICY "Users can delete their assistant assignments" ON public.customer_assistant_assignments
FOR DELETE TO authenticated
USING (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

-- ============================================
-- WHATSAPP AGENT ASSIGNMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can create whatsapp assignments" ON public.customer_whatsapp_agent_assignments;
DROP POLICY IF EXISTS "Users can view their whatsapp assignments" ON public.customer_whatsapp_agent_assignments;
DROP POLICY IF EXISTS "Users can delete their whatsapp assignments" ON public.customer_whatsapp_agent_assignments;

CREATE POLICY "Users can create whatsapp assignments" ON public.customer_whatsapp_agent_assignments
FOR INSERT TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

CREATE POLICY "Users can view their whatsapp assignments" ON public.customer_whatsapp_agent_assignments
FOR SELECT TO authenticated
USING (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);

CREATE POLICY "Users can delete their whatsapp assignments" ON public.customer_whatsapp_agent_assignments
FOR DELETE TO authenticated
USING (
  assigned_by = auth.uid()
  OR assigned_by IN (SELECT get_direct_teammates(auth.uid()))
);
