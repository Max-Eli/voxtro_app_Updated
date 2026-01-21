-- Update RLS policy for voice_assistant_transcripts to include phone number matching
DROP POLICY IF EXISTS "Customers can view transcripts for their calls" ON voice_assistant_transcripts;

CREATE POLICY "Customers can view transcripts for their calls"
ON voice_assistant_transcripts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM voice_assistant_calls vac
    WHERE vac.id = voice_assistant_transcripts.call_id
    AND (
      vac.customer_id = get_current_customer_id()
      OR EXISTS (
        SELECT 1 FROM voice_assistants va
        JOIN customer_assistant_assignments caa ON caa.assistant_id = va.id
        JOIN customers c ON c.id = caa.customer_id
        WHERE va.phone_number = vac.phone_number
        AND c.email = auth.email()
      )
    )
  )
);

-- Update RLS policy for voice_assistant_recordings to include phone number matching
DROP POLICY IF EXISTS "Customers can view recordings for their calls" ON voice_assistant_recordings;

CREATE POLICY "Customers can view recordings for their calls"
ON voice_assistant_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM voice_assistant_calls vac
    WHERE vac.id = voice_assistant_recordings.call_id
    AND (
      vac.customer_id = get_current_customer_id()
      OR EXISTS (
        SELECT 1 FROM voice_assistants va
        JOIN customer_assistant_assignments caa ON caa.assistant_id = va.id
        JOIN customers c ON c.id = caa.customer_id
        WHERE va.phone_number = vac.phone_number
        AND c.email = auth.email()
      )
    )
  )
);