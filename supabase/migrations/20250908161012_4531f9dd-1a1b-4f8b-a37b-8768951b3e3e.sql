-- Add terms and conditions support to chatbot forms
ALTER TABLE public.chatbot_forms 
ADD COLUMN terms_and_conditions TEXT,
ADD COLUMN require_terms_acceptance BOOLEAN NOT NULL DEFAULT false;