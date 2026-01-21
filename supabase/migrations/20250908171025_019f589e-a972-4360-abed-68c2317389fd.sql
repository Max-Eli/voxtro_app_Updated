-- Create secure functions to check customer access
-- First, create a function to get current customer ID securely
CREATE OR REPLACE FUNCTION public.get_current_customer_id_secure()
RETURNS uuid AS $$
  SELECT c.id 
  FROM public.customers c
  WHERE c.email = auth.email()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create a function to check if current user is assigned to a chatbot
CREATE OR REPLACE FUNCTION public.current_customer_has_chatbot(chatbot_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_chatbot_assignments cca
    JOIN public.customers c ON cca.customer_id = c.id
    WHERE cca.chatbot_id = current_customer_has_chatbot.chatbot_id 
    AND c.email = auth.email()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Fix conversations policy using secure function
DROP POLICY IF EXISTS "Customers can view conversations for assigned chatbots" ON conversations;
CREATE POLICY "Customers can view conversations for assigned chatbots" 
ON conversations 
FOR SELECT 
USING (public.current_customer_has_chatbot(chatbot_id));

-- Fix messages policy using secure function
DROP POLICY IF EXISTS "Customers can view messages for assigned chatbots" ON messages;
CREATE POLICY "Customers can view messages for assigned chatbots" 
ON messages 
FOR SELECT 
USING (
  EXISTS ( 
    SELECT 1 FROM conversations conv
    WHERE conv.id = messages.conversation_id 
    AND public.current_customer_has_chatbot(conv.chatbot_id)
  )
);

-- Fix form_submissions policy using secure function
DROP POLICY IF EXISTS "Customers can view form submissions for assigned chatbots" ON form_submissions;
CREATE POLICY "Customers can view form submissions for assigned chatbots" 
ON form_submissions 
FOR SELECT 
USING (
  EXISTS ( 
    SELECT 1 FROM chatbot_forms cf
    WHERE cf.id = form_submissions.form_id 
    AND public.current_customer_has_chatbot(cf.chatbot_id)
  )
);

-- Fix customers policies using secure approach
DROP POLICY IF EXISTS "Customers can view their own profile" ON customers;
CREATE POLICY "Customers can view their own profile" 
ON customers 
FOR SELECT 
USING (email = auth.email());

DROP POLICY IF EXISTS "Customers can update their own profile" ON customers;
CREATE POLICY "Customers can update their own profile" 
ON customers 
FOR UPDATE 
USING (email = auth.email());

-- Fix token_usage policy using secure function
DROP POLICY IF EXISTS "Customers can view token usage for assigned chatbots" ON token_usage;
CREATE POLICY "Customers can view token usage for assigned chatbots" 
ON token_usage 
FOR SELECT 
USING (public.current_customer_has_chatbot(chatbot_id));