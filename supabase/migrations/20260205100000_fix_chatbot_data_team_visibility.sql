-- Fix ALL chatbot-related tables to include team visibility
-- Team members can currently see a chatbot but none of its data (conversations, messages, FAQs, etc.)
-- This adds get_direct_teammates() checks to match the chatbot's own SELECT/UPDATE/DELETE policies

-- ============================================
-- CONVERSATIONS
-- ============================================
DROP POLICY IF EXISTS "Chatbot owners can view conversations" ON public.conversations;
CREATE POLICY "Chatbot owners can view conversations" ON public.conversations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = conversations.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Chatbot owners can view messages" ON public.messages;
CREATE POLICY "Chatbot owners can view messages" ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN chatbots cb ON c.chatbot_id = cb.id
    WHERE c.id = messages.conversation_id
    AND (
      cb.user_id = auth.uid()
      OR cb.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- CONVERSATION PARAMETERS
-- ============================================
DROP POLICY IF EXISTS "Chatbot owners can view conversation parameters" ON public.conversation_parameters;
CREATE POLICY "Chatbot owners can view conversation parameters" ON public.conversation_parameters
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN chatbots cb ON c.chatbot_id = cb.id
    WHERE c.id = conversation_parameters.conversation_id
    AND (
      cb.user_id = auth.uid()
      OR cb.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- CHATBOT FAQS
-- ============================================
DROP POLICY IF EXISTS "Users can view FAQs for their chatbots" ON public.chatbot_faqs;
CREATE POLICY "Users can view FAQs for their chatbots" ON public.chatbot_faqs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_faqs.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can create FAQs for their chatbots" ON public.chatbot_faqs;
CREATE POLICY "Users can create FAQs for their chatbots" ON public.chatbot_faqs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_faqs.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can update FAQs for their chatbots" ON public.chatbot_faqs;
CREATE POLICY "Users can update FAQs for their chatbots" ON public.chatbot_faqs
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_faqs.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can delete FAQs for their chatbots" ON public.chatbot_faqs;
CREATE POLICY "Users can delete FAQs for their chatbots" ON public.chatbot_faqs
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_faqs.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- CHATBOT ACTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view their chatbot actions" ON public.chatbot_actions;
CREATE POLICY "Users can view their chatbot actions" ON public.chatbot_actions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_actions.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can create actions for their chatbots" ON public.chatbot_actions;
CREATE POLICY "Users can create actions for their chatbots" ON public.chatbot_actions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_actions.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can update their chatbot actions" ON public.chatbot_actions;
CREATE POLICY "Users can update their chatbot actions" ON public.chatbot_actions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_actions.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their chatbot actions" ON public.chatbot_actions;
CREATE POLICY "Users can delete their chatbot actions" ON public.chatbot_actions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_actions.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- CHATBOT FORMS
-- ============================================
DROP POLICY IF EXISTS "Users can view forms for their chatbots" ON public.chatbot_forms;
CREATE POLICY "Users can view forms for their chatbots" ON public.chatbot_forms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_forms.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can create forms for their chatbots" ON public.chatbot_forms;
CREATE POLICY "Users can create forms for their chatbots" ON public.chatbot_forms
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_forms.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can update forms for their chatbots" ON public.chatbot_forms;
CREATE POLICY "Users can update forms for their chatbots" ON public.chatbot_forms
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_forms.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can delete forms for their chatbots" ON public.chatbot_forms;
CREATE POLICY "Users can delete forms for their chatbots" ON public.chatbot_forms
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_forms.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

-- ============================================
-- CHATBOT CUSTOM PARAMETERS
-- ============================================
DROP POLICY IF EXISTS "Users can view their chatbot parameters" ON public.chatbot_custom_parameters;
CREATE POLICY "Users can view their chatbot parameters" ON public.chatbot_custom_parameters
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_custom_parameters.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can create parameters for their chatbots" ON public.chatbot_custom_parameters;
CREATE POLICY "Users can create parameters for their chatbots" ON public.chatbot_custom_parameters
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_custom_parameters.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can update their chatbot parameters" ON public.chatbot_custom_parameters;
CREATE POLICY "Users can update their chatbot parameters" ON public.chatbot_custom_parameters
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_custom_parameters.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their chatbot parameters" ON public.chatbot_custom_parameters;
CREATE POLICY "Users can delete their chatbot parameters" ON public.chatbot_custom_parameters
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chatbots
    WHERE chatbots.id = chatbot_custom_parameters.chatbot_id
    AND (
      chatbots.user_id = auth.uid()
      OR chatbots.user_id IN (SELECT get_direct_teammates(auth.uid()))
    )
  )
);
