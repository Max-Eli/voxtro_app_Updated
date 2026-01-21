-- Add policy for customers to view their assigned WhatsApp agents
CREATE POLICY "Customers can view their assigned whatsapp agents"
ON public.whatsapp_agents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customer_whatsapp_agent_assignments cwaa
    JOIN public.customers c ON c.id = cwaa.customer_id
    WHERE cwaa.agent_id = whatsapp_agents.id
    AND c.email = auth.email()
  )
);