-- Allow team members to edit each other's agents
-- This uses the existing get_direct_teammates function which ensures:
-- - Only users who share a DIRECT team can see/edit each other's agents
-- - No transitive access (if A is on Team X with B, and B is on Team Y with C,
--   C cannot see A's agents unless C is also on Team X)

-- Ensure the get_direct_teammates function exists (create if not)
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
-- CHATBOTS: Team-based UPDATE and DELETE
-- ============================================

-- Drop existing owner-only policies if they exist
DROP POLICY IF EXISTS "Users can update their own chatbots" ON chatbots;
DROP POLICY IF EXISTS "Users can delete their own chatbots" ON chatbots;
DROP POLICY IF EXISTS "chatbots_update_policy" ON chatbots;
DROP POLICY IF EXISTS "chatbots_delete_policy" ON chatbots;

-- Create team-based UPDATE policy for chatbots
-- Users can update chatbots if: they own it OR the owner is a direct teammate
CREATE POLICY "chatbots_update_policy" ON chatbots
FOR UPDATE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based DELETE policy for chatbots
-- Users can delete chatbots if: they own it OR the owner is a direct teammate
CREATE POLICY "chatbots_delete_policy" ON chatbots
FOR DELETE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- ============================================
-- VOICE ASSISTANTS: Team-based UPDATE and DELETE
-- ============================================

-- Drop existing owner-only policies if they exist
DROP POLICY IF EXISTS "Users can update their own assistants" ON voice_assistants;
DROP POLICY IF EXISTS "Users can delete their own assistants" ON voice_assistants;
DROP POLICY IF EXISTS "voice_assistants_update_policy" ON voice_assistants;
DROP POLICY IF EXISTS "voice_assistants_delete_policy" ON voice_assistants;

-- Create team-based UPDATE policy for voice_assistants
CREATE POLICY "voice_assistants_update_policy" ON voice_assistants
FOR UPDATE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based DELETE policy for voice_assistants
CREATE POLICY "voice_assistants_delete_policy" ON voice_assistants
FOR DELETE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- ============================================
-- WHATSAPP AGENTS: Team-based UPDATE and DELETE
-- ============================================

-- Drop existing owner-only policies if they exist
DROP POLICY IF EXISTS "Users can update their own whatsapp agents" ON whatsapp_agents;
DROP POLICY IF EXISTS "Users can delete their own whatsapp agents" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_update_policy" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_delete_policy" ON whatsapp_agents;

-- Create team-based UPDATE policy for whatsapp_agents
CREATE POLICY "whatsapp_agents_update_policy" ON whatsapp_agents
FOR UPDATE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based DELETE policy for whatsapp_agents
CREATE POLICY "whatsapp_agents_delete_policy" ON whatsapp_agents
FOR DELETE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- ============================================
-- VOICE CONNECTIONS: Team-based UPDATE and DELETE
-- (So team members can manage VAPI connections)
-- ============================================

-- Drop existing owner-only policies if they exist
DROP POLICY IF EXISTS "Users can update their own voice connections" ON voice_connections;
DROP POLICY IF EXISTS "Users can delete their own voice connections" ON voice_connections;
DROP POLICY IF EXISTS "voice_connections_update_policy" ON voice_connections;
DROP POLICY IF EXISTS "voice_connections_delete_policy" ON voice_connections;
DROP POLICY IF EXISTS "voice_connections_select_policy" ON voice_connections;

-- Create team-based SELECT policy for voice_connections
CREATE POLICY "voice_connections_select_policy" ON voice_connections
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based UPDATE policy for voice_connections
CREATE POLICY "voice_connections_update_policy" ON voice_connections
FOR UPDATE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based DELETE policy for voice_connections
CREATE POLICY "voice_connections_delete_policy" ON voice_connections
FOR DELETE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- ============================================
-- ELEVENLABS CONNECTIONS: Team-based access
-- (So team members can manage WhatsApp/ElevenLabs connections)
-- ============================================

-- Drop existing owner-only policies if they exist
DROP POLICY IF EXISTS "Users can view their own elevenlabs connections" ON elevenlabs_connections;
DROP POLICY IF EXISTS "Users can update their own elevenlabs connections" ON elevenlabs_connections;
DROP POLICY IF EXISTS "Users can delete their own elevenlabs connections" ON elevenlabs_connections;
DROP POLICY IF EXISTS "elevenlabs_connections_select_policy" ON elevenlabs_connections;
DROP POLICY IF EXISTS "elevenlabs_connections_update_policy" ON elevenlabs_connections;
DROP POLICY IF EXISTS "elevenlabs_connections_delete_policy" ON elevenlabs_connections;

-- Create team-based SELECT policy for elevenlabs_connections
CREATE POLICY "elevenlabs_connections_select_policy" ON elevenlabs_connections
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based UPDATE policy for elevenlabs_connections
CREATE POLICY "elevenlabs_connections_update_policy" ON elevenlabs_connections
FOR UPDATE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create team-based DELETE policy for elevenlabs_connections
CREATE POLICY "elevenlabs_connections_delete_policy" ON elevenlabs_connections
FOR DELETE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);
