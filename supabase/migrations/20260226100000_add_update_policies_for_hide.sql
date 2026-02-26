-- Add UPDATE policies for conversations and whatsapp_conversations
-- so admins can toggle hidden_from_portal via the hide button
-- voice_assistant_calls already has an update policy from voice_calls_team_rls

-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION get_direct_teammates(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT tm_other.user_id
  FROM team_members tm_self
  INNER JOIN team_members tm_other
    ON tm_self.team_org_id = tm_other.team_org_id
  WHERE tm_self.user_id = user_uuid
    AND tm_other.user_id != user_uuid;
$$;

GRANT EXECUTE ON FUNCTION get_direct_teammates(UUID) TO authenticated;

-- ============================================
-- CONVERSATIONS: UPDATE policy (for hide/unhide)
-- ============================================
DROP POLICY IF EXISTS "conversations_update_hidden" ON public.conversations;
CREATE POLICY "conversations_update_hidden" ON public.conversations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = conversations.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- WHATSAPP_CONVERSATIONS: UPDATE policy (for hide/unhide)
-- ============================================
DROP POLICY IF EXISTS "whatsapp_conversations_update_hidden" ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_update_hidden" ON public.whatsapp_conversations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM whatsapp_agents
    WHERE whatsapp_agents.id = whatsapp_conversations.agent_id
    AND (
      whatsapp_agents.user_id = auth.uid()
      OR whatsapp_agents.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);
