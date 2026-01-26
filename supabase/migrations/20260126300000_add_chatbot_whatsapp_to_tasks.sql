-- Add chatbot_id and whatsapp_agent_id columns to tasks
ALTER TABLE voice_assistant_tasks ADD COLUMN IF NOT EXISTS chatbot_id UUID REFERENCES chatbots(id);
ALTER TABLE voice_assistant_tasks ADD COLUMN IF NOT EXISTS whatsapp_agent_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_voice_assistant_tasks_chatbot_id ON voice_assistant_tasks(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_voice_assistant_tasks_whatsapp_agent_id ON voice_assistant_tasks(whatsapp_agent_id);
