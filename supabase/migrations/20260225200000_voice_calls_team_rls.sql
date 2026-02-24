-- Add team-level SELECT policies for voice call data
-- Makes call visibility consistent with voice_assistants (which already has team access)
-- Uses the same get_teammate_user_ids() function as voice_assistants_select_team

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
