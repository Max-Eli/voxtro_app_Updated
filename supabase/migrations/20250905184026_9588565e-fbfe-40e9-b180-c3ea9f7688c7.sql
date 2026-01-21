-- Add form buttons layout option to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN widget_form_buttons_layout TEXT DEFAULT 'vertical' CHECK (widget_form_buttons_layout IN ('vertical', 'horizontal'));