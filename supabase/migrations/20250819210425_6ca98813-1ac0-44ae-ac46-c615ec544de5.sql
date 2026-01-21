-- Add end-of-chat email notification fields to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN end_chat_notification_enabled boolean DEFAULT false,
ADD COLUMN end_chat_notification_email text;