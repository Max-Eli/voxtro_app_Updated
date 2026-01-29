-- Add team sharing RLS policies for changelog_entries
-- This allows team members to see each other's changelog entries

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Users can view team changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Users can insert own changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Users can update own changelog entries" ON public.changelog_entries;
DROP POLICY IF EXISTS "Users can delete own changelog entries" ON public.changelog_entries;

-- Create new policies that include team sharing

-- View policy: Users can see their own entries OR entries from teammates
CREATE POLICY "Users can view own and team changelog entries"
  ON public.changelog_entries FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = changelog_entries.user_id
    )
  );

-- Insert policy: Users can create entries with their own user_id
CREATE POLICY "Users can insert own changelog entries"
  ON public.changelog_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update policy: Users can update their own entries
CREATE POLICY "Users can update own changelog entries"
  ON public.changelog_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Delete policy: Users can delete their own entries
CREATE POLICY "Users can delete own changelog entries"
  ON public.changelog_entries FOR DELETE
  USING (auth.uid() = user_id);
