-- SECURITY FIX: Users were seeing chatbots from non-teammates
-- This migration creates a more secure RLS policy for chatbot visibility

-- Drop all old problematic functions and their dependent policies
DROP FUNCTION IF EXISTS get_teammate_user_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_org_ids() CASCADE;

-- Drop any remaining old policies
DROP POLICY IF EXISTS "chatbots_select_own" ON chatbots;
DROP POLICY IF EXISTS "chatbots_select_team" ON chatbots;
DROP POLICY IF EXISTS "Users can view own or team chatbots" ON chatbots;
DROP POLICY IF EXISTS "Public read access for active chatbots" ON chatbots;

DROP POLICY IF EXISTS "whatsapp_agents_select_own" ON whatsapp_agents;
DROP POLICY IF EXISTS "whatsapp_agents_select_team" ON whatsapp_agents;
DROP POLICY IF EXISTS "Users can view own or team whatsapp agents" ON whatsapp_agents;

DROP POLICY IF EXISTS "voice_assistants_select_own" ON voice_assistants;
DROP POLICY IF EXISTS "voice_assistants_select_team" ON voice_assistants;
DROP POLICY IF EXISTS "Users can view own or team voice assistants" ON voice_assistants;

DROP POLICY IF EXISTS "Users can view their own tasks" ON voice_assistant_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON voice_assistant_tasks;
DROP POLICY IF EXISTS "Users can view own or team-shared tasks" ON voice_assistant_tasks;
DROP POLICY IF EXISTS "Users can update own or team-shared tasks" ON voice_assistant_tasks;

-- Create a new secure helper function that ONLY returns direct teammates
-- (users who share at least one team with the given user)
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

-- Create secure SELECT policies for chatbots
-- Users can see chatbots if: they own it OR the owner is a direct teammate
CREATE POLICY "chatbots_select_policy" ON chatbots
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create secure SELECT policies for whatsapp_agents
CREATE POLICY "whatsapp_agents_select_policy" ON whatsapp_agents
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create secure SELECT policies for voice_assistants
CREATE POLICY "voice_assistants_select_policy" ON voice_assistants
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create secure policies for tasks
-- Users can ONLY see/update tasks they created OR tasks assigned to them
-- (NO automatic team visibility - tasks are private unless explicitly assigned)
CREATE POLICY "tasks_select_policy" ON voice_assistant_tasks
FOR SELECT USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
);

CREATE POLICY "tasks_update_policy" ON voice_assistant_tasks
FOR UPDATE USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
);

-- Helper function to get team IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team_org_id FROM team_members WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_user_team_ids() TO authenticated;

-- CUSTOMERS: Team-based visibility
-- Users can see customers if:
-- 1. They created the customer
-- 2. The creator is a direct teammate
-- 3. The customer belongs to their team (via team_org_id)
CREATE POLICY "customers_team_select_policy" ON customers
FOR SELECT USING (
  created_by_user_id = auth.uid()
  OR created_by_user_id IN (SELECT get_direct_teammates(auth.uid()))
  OR team_org_id IN (SELECT get_user_team_ids())
);

-- SUPPORT TICKETS: Team-based visibility (customer -> admin communication)
-- Users can see tickets they own OR tickets for their team
CREATE POLICY "support_tickets_team_select_policy" ON support_tickets
FOR SELECT USING (
  user_id = auth.uid()
  OR team_org_id IN (SELECT get_user_team_ids())
);

-- Users can update tickets they own OR tickets for their team
CREATE POLICY "support_tickets_team_update_policy" ON support_tickets
FOR UPDATE USING (
  user_id = auth.uid()
  OR team_org_id IN (SELECT get_user_team_ids())
);

-- SUPPORT TICKET MESSAGES: Team-based visibility
-- Users can view messages if the ticket belongs to their team
CREATE POLICY "team_messages_select_policy" ON support_ticket_messages
FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
    OR team_org_id IN (SELECT get_user_team_ids())
  )
);

-- Users can respond to tickets that belong to their team
CREATE POLICY "team_messages_insert_policy" ON support_ticket_messages
FOR INSERT WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
    OR team_org_id IN (SELECT get_user_team_ids())
  )
);
