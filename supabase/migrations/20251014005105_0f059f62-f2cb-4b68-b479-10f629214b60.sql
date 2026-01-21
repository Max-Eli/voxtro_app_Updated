-- Add gradient color support to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN IF NOT EXISTS theme_color_type TEXT DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS theme_gradient_start TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS theme_gradient_end TEXT DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS theme_gradient_angle INTEGER DEFAULT 135;