-- Update RLS policies for customers to work with anonymous auth + user metadata

-- Update conversations policy for customers
DROP POLICY "Customers can view conversations for assigned chatbots" ON conversations;

CREATE POLICY "Customers can view conversations for assigned chatbots" 
ON conversations FOR SELECT 
USING (
  -- Check if user is a customer and has access to this chatbot
  (auth.jwt() ->> 'is_customer')::boolean = true 
  AND EXISTS (
    SELECT 1 
    FROM customer_chatbot_assignments cca 
    JOIN customers c ON cca.customer_id = c.id 
    WHERE cca.chatbot_id = conversations.chatbot_id 
    AND c.email = (auth.jwt() ->> 'customer_email')
  )
);

-- Update messages policy for customers  
DROP POLICY "Customers can view messages for assigned chatbots" ON messages;

CREATE POLICY "Customers can view messages for assigned chatbots"
ON messages FOR SELECT
USING (
  -- Check if user is a customer and has access to this conversation's chatbot
  (auth.jwt() ->> 'is_customer')::boolean = true 
  AND EXISTS (
    SELECT 1 
    FROM conversations conv 
    JOIN customer_chatbot_assignments cca ON conv.chatbot_id = cca.chatbot_id
    JOIN customers c ON cca.customer_id = c.id
    WHERE conv.id = messages.conversation_id 
    AND c.email = (auth.jwt() ->> 'customer_email')
  )
);

-- Update token_usage policy for customers
DROP POLICY "Customers can view token usage for assigned chatbots" ON token_usage;

CREATE POLICY "Customers can view token usage for assigned chatbots"
ON token_usage FOR SELECT
USING (
  -- Check if user is a customer and has access to this chatbot
  (auth.jwt() ->> 'is_customer')::boolean = true 
  AND EXISTS (
    SELECT 1 
    FROM customer_chatbot_assignments cca 
    JOIN customers c ON cca.customer_id = c.id 
    WHERE cca.chatbot_id = token_usage.chatbot_id 
    AND c.email = (auth.jwt() ->> 'customer_email')
  )
);

-- Update customers table policies
DROP POLICY "Customers can view their own profile" ON customers;
DROP POLICY "Customers can update their own profile" ON customers;

CREATE POLICY "Customers can view their own profile"
ON customers FOR SELECT
USING (
  (auth.jwt() ->> 'is_customer')::boolean = true 
  AND email = (auth.jwt() ->> 'customer_email')
);

CREATE POLICY "Customers can update their own profile"  
ON customers FOR UPDATE
USING (
  (auth.jwt() ->> 'is_customer')::boolean = true 
  AND email = (auth.jwt() ->> 'customer_email')
);

-- Update customer_chatbot_assignments policy for customers
DROP POLICY "Customers can view their assignments" ON customer_chatbot_assignments;

CREATE POLICY "Customers can view their assignments"
ON customer_chatbot_assignments FOR SELECT
USING (
  (auth.jwt() ->> 'is_customer')::boolean = true 
  AND EXISTS (
    SELECT 1 
    FROM customers c 
    WHERE c.id = customer_chatbot_assignments.customer_id 
    AND c.email = (auth.jwt() ->> 'customer_email')
  )
);