-- Fix customer assignment RLS policies to allow team members to assign
-- their customers to teammates' agents (chatbots, voice assistants, WhatsApp agents)

-- ============================================
-- CHATBOT ASSIGNMENTS
-- ============================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create customer assignments" ON public.customer_chatbot_assignments;

-- Create new INSERT policy that includes team chatbots
CREATE POLICY "Users can create customer assignments" ON public.customer_chatbot_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can assign to own chatbots
  chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid())
  OR
  -- Can assign to teammates' chatbots
  chatbot_id IN (
    SELECT id FROM chatbots
    WHERE user_id IN (SELECT get_direct_teammates(auth.uid()))
  )
);

-- Update SELECT policy to include team visibility
DROP POLICY IF EXISTS "Users can view their customer assignments" ON public.customer_chatbot_assignments;
CREATE POLICY "Users can view their customer assignments" ON public.customer_chatbot_assignments
FOR SELECT
TO authenticated
USING (
  assigned_by = auth.uid()
  OR chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid())
  OR chatbot_id IN (SELECT id FROM chatbots WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- Update DELETE policy to include team
DROP POLICY IF EXISTS "Users can delete their customer assignments" ON public.customer_chatbot_assignments;
CREATE POLICY "Users can delete their customer assignments" ON public.customer_chatbot_assignments
FOR DELETE
TO authenticated
USING (
  assigned_by = auth.uid()
  OR chatbot_id IN (SELECT id FROM chatbots WHERE user_id = auth.uid())
  OR chatbot_id IN (SELECT id FROM chatbots WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- ============================================
-- VOICE ASSISTANT ASSIGNMENTS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create assistant assignments" ON public.customer_assistant_assignments;
DROP POLICY IF EXISTS "Users can view their assistant assignments" ON public.customer_assistant_assignments;
DROP POLICY IF EXISTS "Users can delete their assistant assignments" ON public.customer_assistant_assignments;

-- Create INSERT policy with team support
CREATE POLICY "Users can create assistant assignments" ON public.customer_assistant_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  assistant_id IN (SELECT id FROM voice_assistants WHERE user_id = auth.uid())
  OR assistant_id IN (SELECT id FROM voice_assistants WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- Create SELECT policy with team support
CREATE POLICY "Users can view their assistant assignments" ON public.customer_assistant_assignments
FOR SELECT
TO authenticated
USING (
  assigned_by = auth.uid()
  OR assistant_id IN (SELECT id FROM voice_assistants WHERE user_id = auth.uid())
  OR assistant_id IN (SELECT id FROM voice_assistants WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- Create DELETE policy with team support
CREATE POLICY "Users can delete their assistant assignments" ON public.customer_assistant_assignments
FOR DELETE
TO authenticated
USING (
  assigned_by = auth.uid()
  OR assistant_id IN (SELECT id FROM voice_assistants WHERE user_id = auth.uid())
  OR assistant_id IN (SELECT id FROM voice_assistants WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- ============================================
-- WHATSAPP AGENT ASSIGNMENTS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create whatsapp assignments" ON public.customer_whatsapp_agent_assignments;
DROP POLICY IF EXISTS "Users can view their whatsapp assignments" ON public.customer_whatsapp_agent_assignments;
DROP POLICY IF EXISTS "Users can delete their whatsapp assignments" ON public.customer_whatsapp_agent_assignments;

-- Create INSERT policy with team support
CREATE POLICY "Users can create whatsapp assignments" ON public.customer_whatsapp_agent_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id IN (SELECT id FROM whatsapp_agents WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM whatsapp_agents WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- Create SELECT policy with team support
CREATE POLICY "Users can view their whatsapp assignments" ON public.customer_whatsapp_agent_assignments
FOR SELECT
TO authenticated
USING (
  assigned_by = auth.uid()
  OR agent_id IN (SELECT id FROM whatsapp_agents WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM whatsapp_agents WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);

-- Create DELETE policy with team support
CREATE POLICY "Users can delete their whatsapp assignments" ON public.customer_whatsapp_agent_assignments
FOR DELETE
TO authenticated
USING (
  assigned_by = auth.uid()
  OR agent_id IN (SELECT id FROM whatsapp_agents WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM whatsapp_agents WHERE user_id IN (SELECT get_direct_teammates(auth.uid())))
);
