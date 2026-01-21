-- Add org_id column to voice_connections to link with voice_assistants
ALTER TABLE public.voice_connections 
ADD COLUMN IF NOT EXISTS org_id text;