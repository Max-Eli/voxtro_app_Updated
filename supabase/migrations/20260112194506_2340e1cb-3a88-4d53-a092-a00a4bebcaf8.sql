-- Add RLS policies for customers to view leads for their assigned agents

-- Customers can view chatbot leads
CREATE POLICY "Customers can view leads for assigned chatbots"
ON public.leads
FOR SELECT
USING (
  source_type = 'chatbot' AND
  EXISTS (
    SELECT 1 FROM customer_chatbot_assignments cca
    JOIN customers c ON c.id = cca.customer_id
    WHERE cca.chatbot_id = leads.source_id::uuid
    AND c.email = auth.email()
  )
);

-- Customers can view voice assistant leads
CREATE POLICY "Customers can view leads for assigned voice assistants"
ON public.leads
FOR SELECT
USING (
  source_type = 'voice' AND
  EXISTS (
    SELECT 1 FROM customer_assistant_assignments caa
    JOIN customers c ON c.id = caa.customer_id
    WHERE caa.assistant_id = leads.source_id
    AND c.email = auth.email()
  )
);

-- Customers can view WhatsApp agent leads
CREATE POLICY "Customers can view leads for assigned whatsapp agents"
ON public.leads
FOR SELECT
USING (
  source_type = 'whatsapp' AND
  EXISTS (
    SELECT 1 FROM customer_whatsapp_agent_assignments cwaa
    JOIN customers c ON c.id = cwaa.customer_id
    WHERE cwaa.agent_id = leads.source_id
    AND c.email = auth.email()
  )
);