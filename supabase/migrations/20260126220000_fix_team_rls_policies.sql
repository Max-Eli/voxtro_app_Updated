-- Fix RLS policies to avoid circular references and 500 errors

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their team memberships" ON team_members;
DROP POLICY IF EXISTS "Team members can view their organizations" ON team_organizations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;

-- Simple policy for team_members: users can see memberships for teams they belong to
CREATE POLICY "Users can view team memberships" ON team_members
FOR SELECT USING (
  user_id = auth.uid()
);

-- Allow team owners to view all members of their teams
CREATE POLICY "Team owners can view all members" ON team_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_org_id = team_members.team_org_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'owner'
  )
);

-- Simple policy for team_organizations: users can see teams they created or are members of
CREATE POLICY "Users can view their teams" ON team_organizations
FOR SELECT USING (
  created_by = auth.uid() OR
  id IN (SELECT team_org_id FROM team_members WHERE user_id = auth.uid())
);

-- Allow users to create teams
DROP POLICY IF EXISTS "Users can create teams" ON team_organizations;
CREATE POLICY "Users can create teams" ON team_organizations
FOR INSERT WITH CHECK (created_by = auth.uid());

-- Allow team owners to update their teams
DROP POLICY IF EXISTS "Team owners can update teams" ON team_organizations;
CREATE POLICY "Team owners can update teams" ON team_organizations
FOR UPDATE USING (created_by = auth.uid());

-- Allow team owners to delete their teams
DROP POLICY IF EXISTS "Team owners can delete teams" ON team_organizations;
CREATE POLICY "Team owners can delete teams" ON team_organizations
FOR DELETE USING (created_by = auth.uid());

-- Team invitations policies
-- Anyone can view invitations (token acts as authentication for acceptance)
CREATE POLICY "Public can view invitations" ON team_invitations
FOR SELECT USING (true);

-- Team owners can create invitations
CREATE POLICY "Owners can create invitations" ON team_invitations
FOR INSERT WITH CHECK (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_org_id = team_invitations.team_org_id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);

-- Team owners can delete invitations
CREATE POLICY "Owners can delete invitations" ON team_invitations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_org_id = team_invitations.team_org_id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);
