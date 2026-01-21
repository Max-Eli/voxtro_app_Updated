-- Create voice_assistant_tasks table
CREATE TABLE public.voice_assistant_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assistant_id TEXT NOT NULL,
  org_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_assistant_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks"
ON public.voice_assistant_tasks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.voice_assistant_tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.voice_assistant_tasks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.voice_assistant_tasks
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX idx_voice_assistant_tasks_user_id ON public.voice_assistant_tasks(user_id);
CREATE INDEX idx_voice_assistant_tasks_assistant_id ON public.voice_assistant_tasks(assistant_id);
CREATE INDEX idx_voice_assistant_tasks_status ON public.voice_assistant_tasks(status);
CREATE INDEX idx_voice_assistant_tasks_priority ON public.voice_assistant_tasks(priority);

-- Create trigger for updated_at
CREATE TRIGGER update_voice_assistant_tasks_updated_at
BEFORE UPDATE ON public.voice_assistant_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();