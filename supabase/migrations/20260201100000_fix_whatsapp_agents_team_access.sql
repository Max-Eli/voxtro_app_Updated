-- Fix WhatsApp agents team access
-- This migration ensures teammates can view each other's WhatsApp agents
-- Same as voice_assistants and chatbots

-- First, ensure the helper function exists
CREATE OR REPLACE FUNCTION get_direct_teammates(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Get user IDs of people who share a team with the given user
  -- This explicitly requires BOTH users to be members of the SAME team
  SELECT DISTINCT tm_other.user_id
  FROM team_members tm_self
  INNER JOIN team_members tm_other
    ON tm_self.team_org_id = tm_other.team_org_id
  WHERE tm_self.user_id = user_uuid
    AND tm_other.user_id != user_uuid;  -- Exclude the user themselves
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_direct_teammates(UUID) TO authenticated;

-- Drop ALL possible existing SELECT policies on whatsapp_agents to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own whatsapp agents" ON whatsapp_agents;
DROP POLICY IF EXISTS "Users can view teammate whatsapp agents" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_select_own" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_select_team" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_select_policy" ON whatsapp_agents;
DROP POLICY IF EXISTS "Users can view own or team whatsapp agents" ON whatsapp_agents;

-- Create a single unified SELECT policy
-- Users can see WhatsApp agents if: they own it OR the owner is a direct teammate
CREATE POLICY "whatsapp_agents_select_policy" ON whatsapp_agents
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Also fix elevenlabs_connections to allow team access
-- This is needed because the get-whatsapp-agent function needs to access
-- the teammate's ElevenLabs connection to fetch agent details

-- Drop existing SELECT policies on elevenlabs_connections
DROP POLICY IF EXISTS "Users can view their own elevenlabs connections" ON elevenlabs_connections;
DROP POLICY IF EXISTS "elevenlabs_connections_select_own" ON elevenlabs_connections;
DROP POLICY IF EXISTS "elevenlabs_connections_select_team" ON elevenlabs_connections;
DROP POLICY IF EXISTS "elevenlabs_connections_select_policy" ON elevenlabs_connections;

-- Create team-aware SELECT policy for elevenlabs_connections
-- Users can see their own connections OR teammate's connections
CREATE POLICY "elevenlabs_connections_select_policy" ON elevenlabs_connections
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);
