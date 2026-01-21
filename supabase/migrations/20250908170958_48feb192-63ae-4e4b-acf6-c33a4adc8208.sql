-- Fix RLS policies for customer access to conversations and messages

-- Update conversations policy for customers
DROP POLICY IF EXISTS "Customers can view conversations for assigned chatbots" ON conversations;
CREATE POLICY "Customers can view conversations for assigned chatbots" 
ON conversations 
FOR SELECT 
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true) 
  AND 
  (EXISTS ( 
    SELECT 1
    FROM (customer_chatbot_assignments cca
      JOIN customers c ON (cca.customer_id = c.id))
    WHERE (
      cca.chatbot_id = conversations.chatbot_id 
      AND 
      c.email = (auth.jwt() -> 'user_metadata' ->> 'customer_email')
    )
  ))
);

-- Update messages policy for customers
DROP POLICY IF EXISTS "Customers can view messages for assigned chatbots" ON messages;
CREATE POLICY "Customers can view messages for assigned chatbots" 
ON messages 
FOR SELECT 
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true) 
  AND 
  (EXISTS ( 
    SELECT 1
    FROM ((conversations conv
      JOIN customer_chatbot_assignments cca ON (conv.chatbot_id = cca.chatbot_id))
      JOIN customers c ON (cca.customer_id = c.id))
    WHERE (
      conv.id = messages.conversation_id 
      AND 
      c.email = (auth.jwt() -> 'user_metadata' ->> 'customer_email')
    )
  ))
);

-- Update form_submissions policy for customers
DROP POLICY IF EXISTS "Customers can view form submissions for assigned chatbots" ON form_submissions;
CREATE POLICY "Customers can view form submissions for assigned chatbots" 
ON form_submissions 
FOR SELECT 
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true) 
  AND 
  (EXISTS ( 
    SELECT 1
    FROM ((chatbot_forms cf
      JOIN customer_chatbot_assignments cca ON (cf.chatbot_id = cca.chatbot_id))
      JOIN customers c ON (cca.customer_id = c.id))
    WHERE (
      cf.id = form_submissions.form_id 
      AND 
      c.email = (auth.jwt() -> 'user_metadata' ->> 'customer_email')
    )
  ))
);

-- Update customers policy for customer self-access
DROP POLICY IF EXISTS "Customers can view their own profile" ON customers;
CREATE POLICY "Customers can view their own profile" 
ON customers 
FOR SELECT 
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true) 
  AND 
  (email = (auth.jwt() -> 'user_metadata' ->> 'customer_email'))
);

-- Update customers policy for customer self-update
DROP POLICY IF EXISTS "Customers can update their own profile" ON customers;
CREATE POLICY "Customers can update their own profile" 
ON customers 
FOR UPDATE 
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true) 
  AND 
  (email = (auth.jwt() -> 'user_metadata' ->> 'customer_email'))
);

-- Update token_usage policy for customers
DROP POLICY IF EXISTS "Customers can view token usage for assigned chatbots" ON token_usage;
CREATE POLICY "Customers can view token usage for assigned chatbots" 
ON token_usage 
FOR SELECT 
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'is_customer')::boolean = true) 
  AND 
  (EXISTS ( 
    SELECT 1
    FROM (customer_chatbot_assignments cca
      JOIN customers c ON (cca.customer_id = c.id))
    WHERE (
      cca.chatbot_id = token_usage.chatbot_id 
      AND 
      c.email = (auth.jwt() -> 'user_metadata' ->> 'customer_email')
    )
  ))
);