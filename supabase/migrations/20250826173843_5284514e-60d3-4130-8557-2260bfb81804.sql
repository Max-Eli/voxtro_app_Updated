-- Add widget customization columns to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN widget_button_text TEXT DEFAULT 'Chat with us',
ADD COLUMN widget_position TEXT DEFAULT 'bottom-right' CHECK (widget_position IN ('center', 'bottom-right', 'bottom-left', 'top-right', 'top-left')),
ADD COLUMN widget_button_color TEXT DEFAULT '#3B82F6',
ADD COLUMN widget_text_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN widget_size TEXT DEFAULT 'medium' CHECK (widget_size IN ('small', 'medium', 'large')),
ADD COLUMN widget_border_radius TEXT DEFAULT 'rounded' CHECK (widget_border_radius IN ('square', 'rounded', 'circular')),
ADD COLUMN widget_custom_css TEXT DEFAULT '';