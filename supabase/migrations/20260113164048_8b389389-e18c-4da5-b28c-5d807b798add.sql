
-- Reset lead_analyzed_at for all conversations belonging to max@voxtro.io's chatbots
UPDATE conversations 
SET lead_analyzed_at = NULL 
WHERE chatbot_id IN (
  SELECT id FROM chatbots WHERE user_id = '76674fb8-e9c6-4cd2-88de-455f10f9a14f'
);

-- Reset lead_analyzed_at for all voice assistant calls belonging to max@voxtro.io's assistants
UPDATE voice_assistant_calls 
SET lead_analyzed_at = NULL 
WHERE assistant_id IN (
  SELECT id FROM voice_assistants WHERE user_id = '76674fb8-e9c6-4cd2-88de-455f10f9a14f'
);

-- Reset lead_analyzed_at for all WhatsApp conversations belonging to max@voxtro.io's agents
UPDATE whatsapp_conversations 
SET lead_analyzed_at = NULL 
WHERE agent_id IN (
  SELECT id FROM whatsapp_agents WHERE user_id = '76674fb8-e9c6-4cd2-88de-455f10f9a14f'
);

-- Also delete any leads that were created (they likely failed to save properly anyway)
DELETE FROM leads 
WHERE user_id = '76674fb8-e9c6-4cd2-88de-455f10f9a14f';
