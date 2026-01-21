-- Expand email_conditions to support more flexible rule types
-- The new structure will support:
-- 1. Message content matching (user/bot/any messages with various match types)
-- 2. Custom parameter conditions (conversation_length, user_rating, etc.)
-- 3. Complex AND/OR logic grouping

-- Update chatbots table to support the expanded email conditions format
-- New format will be:
-- {
--   "logic": "AND|OR",
--   "groups": [
--     {
--       "logic": "AND|OR", 
--       "rules": [
--         {
--           "type": "message_content|custom_parameter|basic",
--           "field": "user_message|bot_message|any_message|conversation_length|user_rating|etc",
--           "operator": "contains|equals|starts_with|ends_with|greater_than|less_than|etc",
--           "value": "text or number",
--           "case_sensitive": boolean (for message content only)
--         }
--       ]
--     }
--   ]
-- }

-- Add a column to store available custom parameters for evaluation
ALTER TABLE public.chatbots 
ADD COLUMN IF NOT EXISTS email_condition_parameters jsonb DEFAULT '{
  "conversation_length": {"type": "number", "label": "Conversation Length (messages)"},
  "conversation_duration": {"type": "number", "label": "Duration (minutes)"},
  "user_rating": {"type": "number", "label": "User Rating"},
  "summary_sentiment": {"type": "text", "label": "Summary Sentiment"},
  "agent_name": {"type": "text", "label": "Agent/Bot Name"}
}'::jsonb;