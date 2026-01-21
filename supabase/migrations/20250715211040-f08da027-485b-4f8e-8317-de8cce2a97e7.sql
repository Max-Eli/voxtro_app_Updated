-- Add welcome_message field to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN welcome_message TEXT DEFAULT 'Hi! I''m here to help you. How can I assist you today?';