-- Add column to control branding visibility
ALTER TABLE public.chatbots 
ADD COLUMN hide_branding boolean NOT NULL DEFAULT false;