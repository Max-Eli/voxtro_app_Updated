-- Add answer field to chatbot_faqs table
ALTER TABLE public.chatbot_faqs 
ADD COLUMN answer TEXT;