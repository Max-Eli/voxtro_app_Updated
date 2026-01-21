-- Add custom email template and conditional logic columns to chatbots table
ALTER TABLE public.chatbots 
ADD COLUMN email_template text DEFAULT 'Conversation Summary for {{bot_name}}

Hi there,

A conversation with your chatbot "{{bot_name}}" has ended.

**Session Details:**
- End Date & Time: {{timestamp}}
- Last Activity: {{timestamp}}

**Conversation Summary:**
{{conversation_summary}}

**First Message:**
{{first_message}}

**Last Message:**
{{last_message}}

---
This is an automated notification from your Voxtro chatbot system.',
ADD COLUMN email_conditions jsonb DEFAULT '{"rules": [{"field": "always", "operator": "equals", "value": "true"}], "logic": "AND"}'::jsonb;

-- Add comments for better documentation
COMMENT ON COLUMN public.chatbots.email_template IS 'Custom email template with variables: {{user_name}}, {{bot_name}}, {{conversation_summary}}, {{timestamp}}, {{first_message}}, {{last_message}}';
COMMENT ON COLUMN public.chatbots.email_conditions IS 'Conditional logic for email sending. Structure: {"rules": [{"field": "string", "operator": "string", "value": "string"}], "logic": "AND|OR"}';