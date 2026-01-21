-- Change id column from UUID to TEXT for whatsapp_messages
DROP POLICY IF EXISTS "Customers can view messages for their conversations" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can view messages for their agent conversations" ON public.whatsapp_messages;

ALTER TABLE public.whatsapp_messages 
ALTER COLUMN id TYPE TEXT USING id::TEXT;

ALTER TABLE public.whatsapp_messages 
ALTER COLUMN id DROP DEFAULT;

-- Recreate policies
CREATE POLICY "Users can view messages for their agent conversations"
ON public.whatsapp_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.whatsapp_agents wa ON wa.id = wc.agent_id
    WHERE wc.id = whatsapp_messages.conversation_id
    AND wa.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view messages for their conversations"
ON public.whatsapp_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = whatsapp_messages.conversation_id
    AND (
      wc.customer_id = get_current_customer_id()
      OR EXISTS (
        SELECT 1 FROM public.customer_whatsapp_agent_assignments cwaa
        JOIN public.customers c ON c.id = cwaa.customer_id
        WHERE cwaa.agent_id = wc.agent_id
        AND c.email = auth.email()
      )
    )
  )
);

-- Add policy for service role to insert messages
CREATE POLICY "Service role can manage messages"
ON public.whatsapp_messages
FOR ALL
USING (true)
WITH CHECK (true);