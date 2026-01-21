-- Create changelog_entries table
CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chatbot', 'voice_assistant')),
  entity_id TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('update', 'create', 'delete', 'note', 'task')),
  title TEXT NOT NULL,
  description TEXT,
  previous_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', NULL)),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto', 'vapi_sync')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create changelog_notes table
CREATE TABLE public.changelog_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changelog_entry_id UUID NOT NULL REFERENCES public.changelog_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for changelog_entries
CREATE POLICY "Users can view their own changelog entries"
ON public.changelog_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own changelog entries"
ON public.changelog_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own changelog entries"
ON public.changelog_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own changelog entries"
ON public.changelog_entries FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for changelog_notes
CREATE POLICY "Users can view their own changelog notes"
ON public.changelog_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own changelog notes"
ON public.changelog_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own changelog notes"
ON public.changelog_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own changelog notes"
ON public.changelog_notes FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_changelog_entries_user_id ON public.changelog_entries(user_id);
CREATE INDEX idx_changelog_entries_entity ON public.changelog_entries(entity_type, entity_id);
CREATE INDEX idx_changelog_entries_created_at ON public.changelog_entries(created_at DESC);
CREATE INDEX idx_changelog_notes_entry_id ON public.changelog_notes(changelog_entry_id);

-- Trigger for updated_at
CREATE TRIGGER update_changelog_entries_updated_at
BEFORE UPDATE ON public.changelog_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();