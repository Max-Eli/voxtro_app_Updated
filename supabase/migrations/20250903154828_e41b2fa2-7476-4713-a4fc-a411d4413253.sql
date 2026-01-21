-- Copy custom parameters from original chatbot to duplicated chatbot
INSERT INTO chatbot_custom_parameters (chatbot_id, parameter_name, parameter_type, extraction_rules, is_required, validation_rules)
VALUES 
  ('0d313e03-9096-44ad-ae0e-5019e86b212a', 'name', 'text', '{"patterns": ["name is *", "my name is *", "call me *"]}', true, '{}'),
  ('0d313e03-9096-44ad-ae0e-5019e86b212a', 'phone_number', 'text', '{"patterns": ["number is *", "my phone number is *", "call me *", "* is my number", "phone number is *"]}', true, '{}'),
  ('0d313e03-9096-44ad-ae0e-5019e86b212a', 'condition', 'text', '{"patterns": ["I have *", "* condition", "diagnosed with *", "suffering from *"]}', false, '{}'),
  ('0d313e03-9096-44ad-ae0e-5019e86b212a', 'qualified', 'text', '{"patterns": ["qualified", "not qualified", "eligible", "not eligible"]}', false, '{}');

-- Also copy the chatbot action to the duplicated chatbot
INSERT INTO chatbot_actions (chatbot_id, action_type, name, description, configuration, is_active)
SELECT 
  '0d313e03-9096-44ad-ae0e-5019e86b212a',
  action_type,
  name,
  description,
  configuration,
  is_active
FROM chatbot_actions 
WHERE chatbot_id = 'db57308f-1e83-4922-a0e1-44da0d71dabe';