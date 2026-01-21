-- Add email automation fields to chatbot_actions configuration
-- This allows custom tools to have email automation settings

-- The configuration column already exists as JSONB, so we don't need to modify the table structure
-- We'll just use the existing configuration field to store email automation settings

-- Add a comment to document the new email automation structure
COMMENT ON COLUMN chatbot_actions.configuration IS 'JSONB configuration for the action. For custom_tool actions, can include: webhookUrl, parameters, emailAutomation (with enabled, subject, body, recipients fields)';

-- Example email automation structure that will be stored in configuration:
-- {
--   "webhookUrl": "https://example.com/webhook",
--   "parameters": [...],
--   "emailAutomation": {
--     "enabled": true,
--     "subject": "New Lead from {{bot_name}}",
--     "body": "Name: {{name}}\nEmail: {{email}}\nService: {{service}}",
--     "recipients": ["admin@company.com", "{{email}}"]
--   }
-- }