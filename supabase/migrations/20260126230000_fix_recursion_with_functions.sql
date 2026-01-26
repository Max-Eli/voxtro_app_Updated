-- Fix infinite recursion by using SECURITY DEFINER functions
-- These functions bypass RLS and can be safely used in policies

-- Drop all existing team-related policies first
DROP POLICY IF EXISTS "Users can view team memberships" ON team_members;
DROP POLICY IF EXISTS "Team owners can view all members" ON team_members;
DROP POLICY IF EXISTS "Users can view their teams" ON team_organizations;
DROP POLICY IF EXISTS "Users can create teams" ON team_organizations;
DROP POLICY IF EXISTS "Team owners can update teams" ON team_organizations;
DROP POLICY IF EXISTS "Team owners can delete teams" ON team_organizations;
DROP POLICY IF EXISTS "Public can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Owners can delete invitations" ON team_invitations;

-- Drop any other policies that might exist
DROP POLICY IF EXISTS "Users can view their team memberships" ON team_members;
DROP POLICY IF EXISTS "Team members can view their organizations" ON team_organizations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;

-- Create helper function to get user's team IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_team_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team_org_id FROM team_members WHERE user_id = user_uuid;
$$;

-- Create helper function to check if user is team owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_team_owner(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_org_id = team_uuid
    AND user_id = user_uuid
    AND role = 'owner'
  );
$$;

-- TEAM MEMBERS POLICIES (simple, no recursion)
-- Users can only see their own membership rows
CREATE POLICY "team_members_select" ON team_members
FOR SELECT USING (user_id = auth.uid());

-- Team owners can insert members (via accept_team_invitation function with SECURITY DEFINER)
-- Regular users cannot directly insert

-- Team owners can delete members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE USING (
  is_team_owner(team_org_id, auth.uid()) AND user_id != auth.uid()
);

-- TEAM ORGANIZATIONS POLICIES
-- Users can see teams they created or are members of
CREATE POLICY "team_orgs_select" ON team_organizations
FOR SELECT USING (
  created_by = auth.uid() OR
  id IN (SELECT get_user_team_ids(auth.uid()))
);

-- Users can create teams
CREATE POLICY "team_orgs_insert" ON team_organizations
FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only creators can update their teams
CREATE POLICY "team_orgs_update" ON team_organizations
FOR UPDATE USING (created_by = auth.uid());

-- Only creators can delete their teams
CREATE POLICY "team_orgs_delete" ON team_organizations
FOR DELETE USING (created_by = auth.uid());

-- TEAM INVITATIONS POLICIES
-- Anyone can view invitations (token acts as auth)
CREATE POLICY "team_invitations_select" ON team_invitations
FOR SELECT USING (true);

-- Team owners can create invitations
CREATE POLICY "team_invitations_insert" ON team_invitations
FOR INSERT WITH CHECK (
  invited_by = auth.uid() AND
  is_team_owner(team_org_id, auth.uid())
);

-- Team owners can delete invitations
CREATE POLICY "team_invitations_delete" ON team_invitations
FOR DELETE USING (
  is_team_owner(team_org_id, auth.uid())
);

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_user_team_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_owner(UUID, UUID) TO authenticated;
