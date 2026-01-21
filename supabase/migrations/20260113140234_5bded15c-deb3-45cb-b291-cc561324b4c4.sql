-- Fix existing call records by calculating duration from transcript timestamps
-- and updating status to 'completed' for calls that have transcripts

UPDATE public.voice_assistant_calls vac
SET 
  duration_seconds = COALESCE(
    (
      SELECT CEIL(EXTRACT(EPOCH FROM (MAX(vat.timestamp) - MIN(vat.timestamp))))::integer
      FROM public.voice_assistant_transcripts vat 
      WHERE vat.call_id = vac.id
      GROUP BY vat.call_id
      HAVING COUNT(*) > 1
    ), 
    0
  ),
  status = 'completed',
  ended_at = COALESCE(
    vac.ended_at,
    (
      SELECT MAX(vat.timestamp)
      FROM public.voice_assistant_transcripts vat 
      WHERE vat.call_id = vac.id
    )
  )
WHERE vac.id IN (
  SELECT DISTINCT call_id 
  FROM public.voice_assistant_transcripts
)
AND (vac.duration_seconds = 0 OR vac.duration_seconds IS NULL OR vac.status IN ('ringing', 'queued'));