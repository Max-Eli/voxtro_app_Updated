-- Delete all existing leads for max@voxtro.io's assigned agents
DELETE FROM leads 
WHERE source_id IN (
  '469256f5-bb8c-42f2-a412-316d87d4735a',  -- chatbot
  '6ad75e8f-b6bf-48a3-b7e8-275db9c13380',  -- voice assistant
  'agent_4001kehwdqqbffgvpbeenjf5bkwt'     -- whatsapp agent
);