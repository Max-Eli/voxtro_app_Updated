-- Add foreign key constraint between chatbot_forms and chatbots
ALTER TABLE public.chatbot_forms 
ADD CONSTRAINT chatbot_forms_chatbot_id_fkey 
FOREIGN KEY (chatbot_id) REFERENCES public.chatbots(id) ON DELETE CASCADE;