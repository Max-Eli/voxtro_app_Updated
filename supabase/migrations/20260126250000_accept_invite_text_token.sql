-- Change accept_team_invitation to accept TEXT token (not UUID)
-- The tokens are generated as hashes, not UUIDs

DROP FUNCTION IF EXISTS accept_team_invitation(UUID);
DROP FUNCTION IF EXISTS accept_team_invitation(TEXT);

CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
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
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  current_user_email := auth.email();

  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You must be logged in to accept an invitation');
  END IF;

  -- Find the invitation by token (token is TEXT, not UUID)
  SELECT
    ti.*,
    torg.name as team_name
  INTO inv
  FROM team_invitations ti
  JOIN team_organizations torg ON torg.id = ti.team_org_id
  WHERE ti.token::TEXT = invitation_token;

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
    UPDATE team_invitations SET status = 'expired' WHERE id = inv.id;
    RETURN json_build_object('success', false, 'error', 'This invitation has expired');
  END IF;

  -- Check if email matches (case-insensitive)
  IF LOWER(inv.email) != LOWER(current_user_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invitation is for a different email address'
    );
  END IF;

  -- Check if user is already a member of the team
  SELECT * INTO existing_member
  FROM team_members
  WHERE team_org_id = inv.team_org_id AND user_id = current_user_id;

  IF existing_member IS NOT NULL THEN
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

GRANT EXECUTE ON FUNCTION accept_team_invitation(TEXT) TO authenticated;
