-- Fix team invitation acceptance function
-- This migration ensures the accept_team_invitation function works correctly

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS accept_team_invitation(UUID);

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  current_user_id UUID;
  current_user_email TEXT;
  existing_member RECORD;
  result JSON;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  current_user_email := auth.email();

  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You must be logged in to accept an invitation');
  END IF;

  -- Find the invitation
  SELECT
    ti.*,
    torg.name as team_name
  INTO inv
  FROM team_invitations ti
  JOIN team_organizations torg ON torg.id = ti.team_org_id
  WHERE ti.token = invitation_token;

  -- Check if invitation exists
  IF inv IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Check if invitation is pending
  IF inv.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'This invitation has already been used or cancelled');
  END IF;

  -- Check if invitation has expired
  IF inv.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE team_invitations SET status = 'expired' WHERE id = inv.id;
    RETURN json_build_object('success', false, 'error', 'This invitation has expired');
  END IF;

  -- Check if email matches (case-insensitive)
  IF LOWER(inv.email) != LOWER(current_user_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invitation is for a different email address. Expected: ' || inv.email || ', Got: ' || current_user_email
    );
  END IF;

  -- Check if user is already a member of the team
  SELECT * INTO existing_member
  FROM team_members
  WHERE team_org_id = inv.team_org_id AND user_id = current_user_id;

  IF existing_member IS NOT NULL THEN
    -- User is already a member, just update the invitation status
    UPDATE team_invitations SET status = 'accepted' WHERE id = inv.id;
    RETURN json_build_object('success', true, 'message', 'You are already a member of this team');
  END IF;

  -- Add user to team_members
  INSERT INTO team_members (team_org_id, user_id, role)
  VALUES (inv.team_org_id, current_user_id, 'teammate');

  -- Update invitation status
  UPDATE team_invitations SET status = 'accepted' WHERE id = inv.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined ' || inv.team_name,
    'team_org_id', inv.team_org_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_team_invitation(UUID) TO authenticated;

-- Ensure RLS policies are correct for team_invitations
-- Allow anyone to view invitation by token (token acts as authentication)
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON team_invitations;
CREATE POLICY "Anyone can view invitations by token" ON team_invitations
FOR SELECT USING (true);

-- Allow team owners to insert invitations
DROP POLICY IF EXISTS "Team owners can create invitations" ON team_invitations;
CREATE POLICY "Team owners can create invitations" ON team_invitations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_org_id = team_invitations.team_org_id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);

-- Allow team owners to update/delete invitations
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;
CREATE POLICY "Team owners can manage invitations" ON team_invitations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_org_id = team_invitations.team_org_id
    AND team_members.user_id = auth.uid()
    AND team_members.role = 'owner'
  )
);

-- Ensure team_members RLS allows the function to insert (function uses SECURITY DEFINER)
-- But also allow users to see their own memberships
DROP POLICY IF EXISTS "Users can view their team memberships" ON team_members;
CREATE POLICY "Users can view their team memberships" ON team_members
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_org_id = team_members.team_org_id
    AND tm.user_id = auth.uid()
  )
);

-- Ensure team_organizations RLS allows members to see their teams
DROP POLICY IF EXISTS "Team members can view their organizations" ON team_organizations;
CREATE POLICY "Team members can view their organizations" ON team_organizations
FOR SELECT USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_org_id = team_organizations.id
    AND team_members.user_id = auth.uid()
  )
);
