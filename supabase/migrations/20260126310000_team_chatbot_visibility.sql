-- Allow team members to view chatbots created by their teammates

-- Create helper function to get all teammates' user IDs (users in the same teams)
CREATE OR REPLACE FUNCTION get_teammate_user_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT tm2.user_id
  FROM team_members tm1
  JOIN team_members tm2 ON tm1.team_org_id = tm2.team_org_id
  WHERE tm1.user_id = user_uuid;
$$;

-- Grant execute on helper function
GRANT EXECUTE ON FUNCTION get_teammate_user_ids(UUID) TO authenticated;

-- Drop existing chatbot RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own chatbots" ON chatbots;
DROP POLICY IF EXISTS "Users can view teammate chatbots" ON chatbots;
DROP POLICY IF EXISTS "chatbots_select_own" ON chatbots;
DROP POLICY IF EXISTS "chatbots_select_team" ON chatbots;

-- Create new RLS policies for chatbots

-- Users can view their own chatbots
CREATE POLICY "chatbots_select_own" ON chatbots
FOR SELECT USING (user_id = auth.uid());

-- Users can view chatbots created by their teammates
CREATE POLICY "chatbots_select_team" ON chatbots
FOR SELECT USING (
  user_id IN (SELECT get_teammate_user_ids(auth.uid()))
);

-- Apply similar policies for whatsapp_agents table

-- Drop existing whatsapp_agents RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own whatsapp agents" ON whatsapp_agents;
DROP POLICY IF EXISTS "Users can view teammate whatsapp agents" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_select_own" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_select_team" ON whatsapp_agents;

-- Users can view their own WhatsApp agents
CREATE POLICY "whatsapp_agents_select_own" ON whatsapp_agents
FOR SELECT USING (user_id = auth.uid());

-- Users can view WhatsApp agents created by their teammates
CREATE POLICY "whatsapp_agents_select_team" ON whatsapp_agents
FOR SELECT USING (
  user_id IN (SELECT get_teammate_user_ids(auth.uid()))
);

-- Apply similar policies for voice_assistants table

-- Drop existing voice_assistants RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own voice assistants" ON voice_assistants;
DROP POLICY IF EXISTS "Users can view teammate voice assistants" ON voice_assistants;
DROP POLICY IF EXISTS "voice_assistants_select_own" ON voice_assistants;
DROP POLICY IF EXISTS "voice_assistants_select_team" ON voice_assistants;

-- Users can view their own voice assistants
CREATE POLICY "voice_assistants_select_own" ON voice_assistants
FOR SELECT USING (user_id = auth.uid());

-- Users can view voice assistants created by their teammates
CREATE POLICY "voice_assistants_select_team" ON voice_assistants
FOR SELECT USING (
  user_id IN (SELECT get_teammate_user_ids(auth.uid()))
);
