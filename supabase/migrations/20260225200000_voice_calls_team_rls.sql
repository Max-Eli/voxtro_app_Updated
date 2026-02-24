-- Add team-level SELECT policies for voice call data
-- Makes call visibility consistent with voice_assistants (which already has team access)

-- ============================================
-- Ensure helper functions exist (CREATE OR REPLACE is safe to re-run)
-- ============================================

-- Returns ALL teammate user IDs (includes the caller themselves)
CREATE OR REPLACE FUNCTION get_teammate_user_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT tm2.user_id
  FROM team_members tm1
  JOIN team_members tm2 ON tm1.team_org_id = tm2.team_org_id
  WHERE tm1.user_id = user_uuid;
$$;

GRANT EXECUTE ON FUNCTION get_teammate_user_ids(UUID) TO authenticated;

-- Returns direct teammates only (excludes the caller)
CREATE OR REPLACE FUNCTION get_direct_teammates(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT tm_other.user_id
  FROM team_members tm_self
  INNER JOIN team_members tm_other
    ON tm_self.team_org_id = tm_other.team_org_id
  WHERE tm_self.user_id = user_uuid
    AND tm_other.user_id != user_uuid;
$$;

GRANT EXECUTE ON FUNCTION get_direct_teammates(UUID) TO authenticated;

-- ============================================
-- Team RLS policies for voice call data
-- ============================================

-- Calls: team members can view calls for teammates' assistants
CREATE POLICY "voice_assistant_calls_select_team"
ON voice_assistant_calls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM voice_assistants va
    WHERE va.id = voice_assistant_calls.assistant_id
    AND va.user_id IN (SELECT get_teammate_user_ids(auth.uid()))
  )
);

-- Team members can update calls for teammates' assistants (needed for hide/unhide)
CREATE POLICY "voice_assistant_calls_update_team"
ON voice_assistant_calls FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM voice_assistants va
    WHERE va.id = voice_assistant_calls.assistant_id
    AND (va.user_id = auth.uid() OR va.user_id IN (SELECT get_direct_teammates(auth.uid())))
  )
);

-- Transcripts: team members can view transcripts for teammates' assistant calls
CREATE POLICY "voice_assistant_transcripts_select_team"
ON voice_assistant_transcripts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM voice_assistant_calls vac
    JOIN voice_assistants va ON va.id = vac.assistant_id
    WHERE vac.id = voice_assistant_transcripts.call_id
    AND va.user_id IN (SELECT get_teammate_user_ids(auth.uid()))
  )
);

-- Recordings: team members can view recordings for teammates' assistant calls
CREATE POLICY "voice_assistant_recordings_select_team"
ON voice_assistant_recordings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM voice_assistant_calls vac
    JOIN voice_assistants va ON va.id = vac.assistant_id
    WHERE vac.id = voice_assistant_recordings.call_id
    AND va.user_id IN (SELECT get_teammate_user_ids(auth.uid()))
  )
);
