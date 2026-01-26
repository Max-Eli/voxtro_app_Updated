-- Backfill emails for existing team members from accepted invitations
UPDATE team_members tm
SET email = ti.email
FROM team_invitations ti
WHERE tm.team_org_id = ti.team_org_id
  AND ti.status = 'accepted'
  AND LOWER(ti.email) = (
    SELECT LOWER(p.email) FROM profiles p WHERE p.user_id = tm.user_id
  )
  AND tm.email IS NULL;

-- Also try to get emails from profiles for any remaining members without email
UPDATE team_members tm
SET email = p.email
FROM profiles p
WHERE p.user_id = tm.user_id
  AND tm.email IS NULL
  AND p.email IS NOT NULL;
