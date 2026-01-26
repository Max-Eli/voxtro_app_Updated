-- Add assigned_to column for team member assignment
ALTER TABLE voice_assistant_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_assistant_tasks_assigned_to ON voice_assistant_tasks(assigned_to);

-- Update RLS policy to allow users to see tasks assigned to them
DROP POLICY IF EXISTS "Users can view their own tasks" ON voice_assistant_tasks;
CREATE POLICY "Users can view their own tasks" ON voice_assistant_tasks
FOR SELECT USING (
  user_id = auth.uid() OR
  assigned_to = auth.uid() OR
  (team_org_id IS NOT NULL AND team_org_id IN (SELECT get_user_team_ids(auth.uid())))
);

-- Allow users to update tasks they created or are assigned to
DROP POLICY IF EXISTS "Users can update their own tasks" ON voice_assistant_tasks;
CREATE POLICY "Users can update their own tasks" ON voice_assistant_tasks
FOR UPDATE USING (
  user_id = auth.uid() OR
  assigned_to = auth.uid() OR
  (team_org_id IS NOT NULL AND team_org_id IN (SELECT get_user_team_ids(auth.uid())))
);

-- Allow users to delete only tasks they created
DROP POLICY IF EXISTS "Users can delete their own tasks" ON voice_assistant_tasks;
CREATE POLICY "Users can delete their own tasks" ON voice_assistant_tasks
FOR DELETE USING (user_id = auth.uid());

-- Allow users to create tasks
DROP POLICY IF EXISTS "Users can create tasks" ON voice_assistant_tasks;
CREATE POLICY "Users can create tasks" ON voice_assistant_tasks
FOR INSERT WITH CHECK (user_id = auth.uid());
