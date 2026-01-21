-- Add session_timeout_minutes field to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN session_timeout_minutes integer DEFAULT 30 NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.chatbots.session_timeout_minutes IS 'Number of minutes after which chat session resets if no new messages';