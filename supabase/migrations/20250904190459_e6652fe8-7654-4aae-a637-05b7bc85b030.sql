-- Add widget form buttons configuration to chatbots table
ALTER TABLE chatbots 
ADD COLUMN widget_form_buttons JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN chatbots.widget_form_buttons IS 'Configuration for additional form buttons shown on the widget';