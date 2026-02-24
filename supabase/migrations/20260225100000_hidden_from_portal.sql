-- Add hidden_from_portal column to conversation tables
-- Allows admins to hide test conversations from customer portal view

-- 1. Add columns (default false = all existing conversations remain visible)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS hidden_from_portal BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE voice_assistant_calls
  ADD COLUMN IF NOT EXISTS hidden_from_portal BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS hidden_from_portal BOOLEAN NOT NULL DEFAULT false;

-- 2. Partial indexes for efficient customer portal queries
CREATE INDEX IF NOT EXISTS idx_conversations_not_hidden
  ON conversations(chatbot_id, created_at DESC) WHERE hidden_from_portal = false;

CREATE INDEX IF NOT EXISTS idx_voice_calls_not_hidden
  ON voice_assistant_calls(assistant_id, started_at DESC) WHERE hidden_from_portal = false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_convos_not_hidden
  ON whatsapp_conversations(agent_id, started_at DESC) WHERE hidden_from_portal = false;

-- 3. Update SECURITY DEFINER RPC functions to exclude hidden calls

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
  AND vac.hidden_from_portal = false
  ORDER BY vac.started_at DESC;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

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
    AND vac.hidden_from_portal = false
  )
  ORDER BY vat.timestamp ASC;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

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
    AND vac.hidden_from_portal = false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_customer_call_recordings_all()
RETURNS TABLE(call_id UUID, recording_url TEXT) AS $$
  SELECT var.call_id, var.recording_url
  FROM public.voice_assistant_recordings var
  INNER JOIN public.voice_assistant_calls vac ON vac.id = var.call_id
  WHERE vac.assistant_id IN (
    SELECT caa.assistant_id
    FROM public.customer_assistant_assignments caa
    INNER JOIN public.customers c ON c.id = caa.customer_id
    WHERE c.email = auth.email()
  )
  AND vac.hidden_from_portal = false;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;
