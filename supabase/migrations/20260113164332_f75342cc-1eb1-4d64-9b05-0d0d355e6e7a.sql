
-- Reset lead_analyzed_at for conversations belonging to chatbots assigned to this customer
UPDATE public.conversations
SET lead_analyzed_at = NULL
WHERE chatbot_id IN (
  SELECT chatbot_id
  FROM public.customer_chatbot_assignments
  WHERE customer_id = 'c129cc80-a73e-4548-b8cf-fdc67a5ed385'
);

-- Reset lead_analyzed_at for voice calls belonging to assistants assigned to this customer
UPDATE public.voice_assistant_calls
SET lead_analyzed_at = NULL
WHERE assistant_id IN (
  SELECT assistant_id
  FROM public.customer_assistant_assignments
  WHERE customer_id = 'c129cc80-a73e-4548-b8cf-fdc67a5ed385'
);

-- Reset lead_analyzed_at for WhatsApp conversations belonging to agents assigned to this customer
UPDATE public.whatsapp_conversations
SET lead_analyzed_at = NULL
WHERE agent_id IN (
  SELECT agent_id
  FROM public.customer_whatsapp_agent_assignments
  WHERE customer_id = 'c129cc80-a73e-4548-b8cf-fdc67a5ed385'
);
