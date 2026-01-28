-- Create table to track which users have hidden which tasks
-- This allows "delete for me only" functionality on shared tasks
CREATE TABLE IF NOT EXISTS task_hidden_by_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES voice_assistant_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE task_hidden_by_users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own hidden task entries
CREATE POLICY "Users can view their own hidden tasks"
  ON task_hidden_by_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can hide tasks for themselves
CREATE POLICY "Users can hide tasks for themselves"
  ON task_hidden_by_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unhide tasks they've hidden
CREATE POLICY "Users can unhide their own hidden tasks"
  ON task_hidden_by_users
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_task_hidden_by_users_user_id ON task_hidden_by_users(user_id);
CREATE INDEX idx_task_hidden_by_users_task_id ON task_hidden_by_users(task_id);
