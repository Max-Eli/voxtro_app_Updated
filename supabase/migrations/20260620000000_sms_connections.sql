-- SMS platform connections — each admin user stores their own build.voxtro.io
-- API key (vxt_live_xxx) so this feature works the same way VAPI's
-- voice_connections and ElevenLabs' elevenlabs_connections do: no env vars,
-- per-user keys, manageable from the admin Settings page.
--
-- Mirrors the shape of elevenlabs_connections exactly.

CREATE TABLE IF NOT EXISTS public.sms_connections (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  api_key     TEXT        NOT NULL,
  org_name    TEXT,                                       -- friendly label shown in the UI
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_connections_user_id
  ON public.sms_connections(user_id);

ALTER TABLE public.sms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SMS connections"
  ON public.sms_connections FOR SELECT  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SMS connections"
  ON public.sms_connections FOR INSERT  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS connections"
  ON public.sms_connections FOR UPDATE  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMS connections"
  ON public.sms_connections FOR DELETE  USING (auth.uid() = user_id);

CREATE TRIGGER update_sms_connections_updated_at
  BEFORE UPDATE ON public.sms_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Per-assignment connection link. Each customer_sms_agent_assignments row
-- now records WHICH SMS connection's key to use for that specific agent —
-- which means a customer can have agents that live under different admins'
-- build.voxtro.io accounts. Nullable for backwards compatibility with rows
-- inserted before this column existed; the backend treats a NULL
-- sms_connection_id as a misconfiguration and skips that assignment.
ALTER TABLE public.customer_sms_agent_assignments
  ADD COLUMN IF NOT EXISTS sms_connection_id UUID
    REFERENCES public.sms_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_sms_agent_assignments_connection
  ON public.customer_sms_agent_assignments(sms_connection_id);
