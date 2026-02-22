-- Performance indexes for hot-path tables
-- These prevent full table scans on queries that run on every chat message

-- Speed up message history loads (fetched on every single chat message)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at ASC);

-- Speed up token limit checks (aggregated on every message when limits are set)
CREATE INDEX IF NOT EXISTS idx_token_usage_chatbot_created
  ON public.token_usage(chatbot_id, created_at);

-- Speed up conversation lookup by visitor (runs when no conversation_id is provided)
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_visitor_status
  ON public.conversations(chatbot_id, visitor_id, status);
