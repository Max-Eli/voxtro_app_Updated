-- Add unique constraint on conversation_id for upsert to work
ALTER TABLE leads ADD CONSTRAINT leads_conversation_id_unique UNIQUE (conversation_id);

-- Create RLS policies for the leads table
-- Admins can view leads for their own agents
CREATE POLICY "Admins can view their own leads"
ON leads FOR SELECT
USING (user_id = auth.uid());

-- Customers can view leads from their assigned agents
-- Cast UUID columns to TEXT for comparison with leads.source_id
CREATE POLICY "Customers can view leads from assigned agents"
ON leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.email = auth.email()
    AND (
      -- Check chatbot assignments
      (source_type = 'chatbot' AND EXISTS (
        SELECT 1 FROM customer_chatbot_assignments cca 
        WHERE cca.customer_id = c.id AND cca.chatbot_id::text = leads.source_id
      ))
      OR
      -- Check voice assistant assignments
      (source_type = 'voice' AND EXISTS (
        SELECT 1 FROM customer_assistant_assignments caa 
        WHERE caa.customer_id = c.id AND caa.assistant_id::text = leads.source_id
      ))
      OR
      -- Check WhatsApp agent assignments
      (source_type = 'whatsapp' AND EXISTS (
        SELECT 1 FROM customer_whatsapp_agent_assignments cwa 
        WHERE cwa.customer_id = c.id AND cwa.agent_id::text = leads.source_id
      ))
    )
  )
);