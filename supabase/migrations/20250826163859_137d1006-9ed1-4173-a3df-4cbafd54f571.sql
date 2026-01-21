-- Add inline chat embed code field to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN inline_embed_code text;