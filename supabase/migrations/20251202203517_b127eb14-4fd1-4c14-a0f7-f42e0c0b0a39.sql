-- Add organization name column to voice_connections for display purposes
ALTER TABLE public.voice_connections 
ADD COLUMN IF NOT EXISTS org_name TEXT;

-- Drop the existing unique constraint on user_id to allow multiple connections per user
-- First check if such constraint exists
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'voice_connections_user_id_key' 
    AND conrelid = 'voice_connections'::regclass
  ) THEN
    ALTER TABLE voice_connections DROP CONSTRAINT voice_connections_user_id_key;
  END IF;
END $$;

-- Create a unique constraint on user_id + api_key to prevent duplicate connections
ALTER TABLE public.voice_connections 
ADD CONSTRAINT voice_connections_user_api_key_unique UNIQUE (user_id, api_key);

-- Update existing connections to have a default org name if null
UPDATE public.voice_connections 
SET org_name = 'Default Organization' 
WHERE org_name IS NULL;