-- Create SECURITY DEFINER RPC functions for customer voice data access.
-- These bypass the complex RLS chain (voice_assistant_calls -> customer_assistant_assignments -> customers)
-- which can fail when multiple RLS-protected tables reference each other in subqueries.

-- Function to get voice assistant IDs assigned to the current customer
CREATE OR REPLACE FUNCTION public.get_customer_assigned_assistant_ids()
RETURNS TEXT[] AS $$
  SELECT COALESCE(
    array_agg(caa.assistant_id),
    ARRAY[]::TEXT[]
  )
  FROM public.customer_assistant_assignments caa
  INNER JOIN public.customers c ON c.id = caa.customer_id
  WHERE c.email = auth.email();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Function to get voice assistants assigned to the current customer
CREATE OR REPLACE FUNCTION public.get_customer_voice_assistants()
RETURNS SETOF public.voice_assistants AS $$
  SELECT va.*
  FROM public.voice_assistants va
  INNER JOIN public.customer_assistant_assignments caa ON caa.assistant_id = va.id
  INNER JOIN public.customers c ON c.id = caa.customer_id
  WHERE c.email = auth.email();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Function to get voice assistant calls for the current customer's assigned assistants
CREATE OR REPLACE FUNCTION public.get_customer_voice_calls()
RETURNS SETOF public.voice_assistant_calls AS $$
  SELECT vac.*
  FROM public.voice_assistant_calls vac
  WHERE vac.assistant_id IN (
    SELECT caa.assistant_id
    FROM public.customer_assistant_assignments caa
    INNER JOIN public.customers c ON c.id = caa.customer_id
    WHERE c.email = auth.email()
  )
  ORDER BY vac.started_at DESC;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Function to get transcripts for a specific call (only if customer has access)
CREATE OR REPLACE FUNCTION public.get_customer_call_transcripts(p_call_id UUID)
RETURNS SETOF public.voice_assistant_transcripts AS $$
  SELECT vat.*
  FROM public.voice_assistant_transcripts vat
  WHERE vat.call_id = p_call_id
  AND EXISTS (
    SELECT 1
    FROM public.voice_assistant_calls vac
    INNER JOIN public.customer_assistant_assignments caa ON caa.assistant_id = vac.assistant_id
    INNER JOIN public.customers c ON c.id = caa.customer_id
    WHERE vac.id = p_call_id
    AND c.email = auth.email()
  )
  ORDER BY vat.timestamp ASC;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Function to get recordings for calls (only if customer has access)
CREATE OR REPLACE FUNCTION public.get_customer_call_recordings(p_call_ids UUID[])
RETURNS TABLE(call_id UUID, recording_url TEXT) AS $$
  SELECT var.call_id, var.recording_url
  FROM public.voice_assistant_recordings var
  WHERE var.call_id = ANY(p_call_ids)
  AND EXISTS (
    SELECT 1
    FROM public.voice_assistant_calls vac
    INNER JOIN public.customer_assistant_assignments caa ON caa.assistant_id = vac.assistant_id
    INNER JOIN public.customers c ON c.id = caa.customer_id
    WHERE vac.id = var.call_id
    AND c.email = auth.email()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;
