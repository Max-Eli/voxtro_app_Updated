-- Add column to track if conversations have been analyzed for leads
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add column to track if voice calls have been analyzed for leads
ALTER TABLE voice_assistant_calls ADD COLUMN IF NOT EXISTS lead_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add column to track if whatsapp conversations have been analyzed for leads
ALTER TABLE whatsapp_conversations ADD COLUMN IF NOT EXISTS lead_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_conversations_lead_analyzed ON conversations(lead_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_voice_calls_lead_analyzed ON voice_assistant_calls(lead_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_convs_lead_analyzed ON whatsapp_conversations(lead_analyzed_at);