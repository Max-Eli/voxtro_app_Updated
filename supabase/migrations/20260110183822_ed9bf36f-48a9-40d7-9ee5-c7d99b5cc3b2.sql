-- Drop existing policies that depend on the columns
DROP POLICY IF EXISTS "Customers can view their conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can insert conversations for their agents" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can view conversations for their agents" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Customers can view messages for their conversations" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can view messages for their agent conversations" ON public.whatsapp_messages;

-- Drop foreign key constraint on whatsapp_messages
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_conversation_id_fkey;

-- Change id column from UUID to TEXT for ElevenLabs conversation IDs
ALTER TABLE public.whatsapp_conversations 
ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Drop the default gen_random_uuid() since we'll use ElevenLabs IDs
ALTER TABLE public.whatsapp_conversations 
ALTER COLUMN id DROP DEFAULT;

-- Also update the whatsapp_messages table to reference TEXT instead of UUID
ALTER TABLE public.whatsapp_messages 
ALTER COLUMN conversation_id TYPE TEXT USING conversation_id::TEXT;

-- Re-add foreign key constraint
ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id);

-- Recreate policies for whatsapp_conversations
CREATE POLICY "Users can view conversations for their agents"
ON public.whatsapp_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_agents wa
    WHERE wa.id = whatsapp_conversations.agent_id
    AND wa.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert conversations for their agents"
ON public.whatsapp_conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_agents wa
    WHERE wa.id = agent_id
    AND wa.user_id = auth.uid()
  )
);

CREATE POLICY "Customers can view their conversations"
ON public.whatsapp_conversations
FOR SELECT
USING (
  customer_id = get_current_customer_id()
  OR EXISTS (
    SELECT 1 FROM public.customer_whatsapp_agent_assignments cwaa
    JOIN public.customers c ON c.id = cwaa.customer_id
    WHERE cwaa.agent_id = whatsapp_conversations.agent_id
    AND c.email = auth.email()
  )
);

-- Recreate policies for whatsapp_messages
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

-- Add INSERT policy for service role to insert conversations
CREATE POLICY "Service role can insert conversations"
ON public.whatsapp_conversations
FOR ALL
USING (true)
WITH CHECK (true);