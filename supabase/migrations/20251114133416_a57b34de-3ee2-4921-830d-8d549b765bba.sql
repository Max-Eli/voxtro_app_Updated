-- Add public_key column to voice_connections table for Vapi Web SDK
ALTER TABLE voice_connections ADD COLUMN IF NOT EXISTS public_key TEXT;