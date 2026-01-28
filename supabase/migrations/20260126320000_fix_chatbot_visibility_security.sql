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
DROP POLICY IF EXISTS "chatbots_select_policy" ON chatbots;
CREATE POLICY "chatbots_select_policy" ON chatbots
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create secure SELECT policies for whatsapp_agents
DROP POLICY IF EXISTS "whatsapp_agents_select_policy" ON whatsapp_agents;
CREATE POLICY "whatsapp_agents_select_policy" ON whatsapp_agents
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create secure SELECT policies for voice_assistants
DROP POLICY IF EXISTS "voice_assistants_select_policy" ON voice_assistants;
CREATE POLICY "voice_assistants_select_policy" ON voice_assistants
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
);

-- Create secure policies for tasks
-- Users can ONLY see/update tasks they created OR tasks assigned to them
-- (NO automatic team visibility - tasks are private unless explicitly assigned)
DROP POLICY IF EXISTS "tasks_select_policy" ON voice_assistant_tasks;
CREATE POLICY "tasks_select_policy" ON voice_assistant_tasks
FOR SELECT USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
);

DROP POLICY IF EXISTS "tasks_update_policy" ON voice_assistant_tasks;
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

-- CUSTOMERS: Drop overly permissive policies first
-- CRITICAL: The old "Allow customer sign-in verification" policy had condition "true"
-- which allowed EVERYONE to see ALL customers - a major security vulnerability
DROP POLICY IF EXISTS "Allow customer sign-in verification" ON customers;

-- CUSTOMERS: Self-access for customer sign-in
-- Customers can view their own record (for authentication purposes)
DROP POLICY IF EXISTS "customers_self_access" ON customers;
CREATE POLICY "customers_self_access" ON customers
FOR SELECT USING (
  user_id = auth.uid()
);

-- CUSTOMERS: Self-update for customer portal
-- Customers can update their own record (for last_login, profile updates)
DROP POLICY IF EXISTS "customers_self_update" ON customers;
CREATE POLICY "customers_self_update" ON customers
FOR UPDATE USING (
  user_id = auth.uid()
);

-- CUSTOMERS: Team-based visibility for admins
-- Users can see customers if:
-- 1. They created the customer
-- 2. The creator is a direct teammate
-- 3. The customer belongs to their team (via team_org_id)
DROP POLICY IF EXISTS "customers_team_select_policy" ON customers;
CREATE POLICY "customers_team_select_policy" ON customers
FOR SELECT USING (
  created_by_user_id = auth.uid()
  OR created_by_user_id IN (SELECT get_direct_teammates(auth.uid()))
  OR team_org_id IN (SELECT get_user_team_ids())
);

-- SUPPORT TICKETS: Team-based visibility (customer -> admin communication)
-- Users can see tickets if:
-- 1. They own the ticket
-- 2. The ticket owner is a direct teammate
-- 3. The ticket belongs to their team (via team_org_id)
DROP POLICY IF EXISTS "support_tickets_team_select_policy" ON support_tickets;
CREATE POLICY "support_tickets_team_select_policy" ON support_tickets
FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
  OR team_org_id IN (SELECT get_user_team_ids())
);

DROP POLICY IF EXISTS "support_tickets_team_update_policy" ON support_tickets;
CREATE POLICY "support_tickets_team_update_policy" ON support_tickets
FOR UPDATE USING (
  user_id = auth.uid()
  OR user_id IN (SELECT get_direct_teammates(auth.uid()))
  OR team_org_id IN (SELECT get_user_team_ids())
);

-- SUPPORT TICKET MESSAGES: Team-based visibility
DROP POLICY IF EXISTS "team_messages_select_policy" ON support_ticket_messages;
CREATE POLICY "team_messages_select_policy" ON support_ticket_messages
FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
    OR user_id IN (SELECT get_direct_teammates(auth.uid()))
    OR team_org_id IN (SELECT get_user_team_ids())
  )
);

DROP POLICY IF EXISTS "team_messages_insert_policy" ON support_ticket_messages;
CREATE POLICY "team_messages_insert_policy" ON support_ticket_messages
FOR INSERT WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
    OR user_id IN (SELECT get_direct_teammates(auth.uid()))
    OR team_org_id IN (SELECT get_user_team_ids())
  )
);

-- CUSTOMER PORTAL: Secure function for sign-in verification
-- This uses SECURITY DEFINER to bypass RLS safely for customer sign-in
-- It's secure because:
-- 1. Requires exact email match (can't enumerate customers)
-- 2. Returns only necessary fields for authentication
-- 3. Can be called by unauthenticated users (needed for sign-in flow)
CREATE OR REPLACE FUNCTION verify_customer_for_signin(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  weekly_summary_enabled BOOLEAN,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.email,
    c.full_name,
    c.company_name,
    c.weekly_summary_enabled,
    c.user_id
  FROM customers c
  WHERE c.email = p_email
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_customer_for_signin(TEXT) TO anon, authenticated;
