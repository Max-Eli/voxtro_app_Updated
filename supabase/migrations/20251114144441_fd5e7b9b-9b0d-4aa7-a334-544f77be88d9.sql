-- Update RLS policy for transcripts to use assistant_id
DROP POLICY IF EXISTS "Customers can view transcripts for their calls" ON voice_assistant_transcripts;

CREATE POLICY "Customers can view transcripts for assigned assistant calls"
ON voice_assistant_transcripts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM voice_assistant_calls vac
    JOIN customer_assistant_assignments caa ON caa.assistant_id = vac.assistant_id
    JOIN customers c ON c.id = caa.customer_id
    WHERE vac.id = voice_assistant_transcripts.call_id
    AND c.email = auth.email()
  )
);

-- Update RLS policy for recordings to use assistant_id
DROP POLICY IF EXISTS "Customers can view recordings for their calls" ON voice_assistant_recordings;

CREATE POLICY "Customers can view recordings for assigned assistant calls"
ON voice_assistant_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM voice_assistant_calls vac
    JOIN customer_assistant_assignments caa ON caa.assistant_id = vac.assistant_id
    JOIN customers c ON c.id = caa.customer_id
    WHERE vac.id = voice_assistant_recordings.call_id
    AND c.email = auth.email()
  )
);