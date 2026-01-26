-- Allow team members to view profiles of other team members
-- This is needed to display names/emails in the team members list

-- Create a function to check if two users are in the same team
CREATE OR REPLACE FUNCTION are_team_members(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_org_id = tm2.team_org_id
    WHERE tm1.user_id = user1_uuid AND tm2.user_id = user2_uuid
  );
$$;

GRANT EXECUTE ON FUNCTION are_team_members(UUID, UUID) TO authenticated;

-- Add policy to allow viewing profiles of team members
DROP POLICY IF EXISTS "Users can view team member profiles" ON profiles;
CREATE POLICY "Users can view team member profiles" ON profiles
FOR SELECT USING (
  user_id = auth.uid() OR
  are_team_members(auth.uid(), user_id)
);
