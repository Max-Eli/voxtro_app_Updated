-- Assignment table for the SMS Agents feature.
--
-- SMS conversations live on the build.voxtro.io platform
-- (Voxtro_Ai_Voice_Agents repo). The Voxtro customer portal reads them
-- via that platform's API; we only store the customer → sms_agent_id
-- mapping here. No local sms_conversations / sms_messages tables —
-- those are queried server-to-server on every page load via the
-- API-key-authed /sms/external/* endpoints.
--
-- Mirrors the shape of customer_whatsapp_agent_assignments. sms_agent_id
-- is plain UUID with no foreign-key constraint because it references a
-- row on a different Supabase project.

CREATE TABLE IF NOT EXISTS public.customer_sms_agent_assignments (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sms_agent_id    UUID        NOT NULL,
  agent_name      TEXT,        -- cached for display; refreshed when listing assignments
  assigned_by     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, sms_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_sms_agent_assignments_customer_id
  ON public.customer_sms_agent_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sms_agent_assignments_sms_agent_id
  ON public.customer_sms_agent_assignments(sms_agent_id);

ALTER TABLE public.customer_sms_agent_assignments ENABLE ROW LEVEL SECURITY;

-- Same policies as customer_whatsapp_agent_assignments
CREATE POLICY "Users can view their own SMS assignments"
  ON public.customer_sms_agent_assignments
  FOR SELECT
  USING (assigned_by = auth.uid());

CREATE POLICY "Users can create SMS assignments"
  ON public.customer_sms_agent_assignments
  FOR INSERT
  WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Users can delete their own SMS assignments"
  ON public.customer_sms_agent_assignments
  FOR DELETE
  USING (assigned_by = auth.uid());

CREATE POLICY "Customers can view their SMS agent assignments"
  ON public.customer_sms_agent_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_sms_agent_assignments.customer_id
      AND c.email = auth.email()
    )
  );
