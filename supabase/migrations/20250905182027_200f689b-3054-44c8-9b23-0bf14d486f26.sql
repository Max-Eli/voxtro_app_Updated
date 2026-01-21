-- Add webhook fields to chatbot_forms table
ALTER TABLE public.chatbot_forms 
ADD COLUMN webhook_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN webhook_url text;