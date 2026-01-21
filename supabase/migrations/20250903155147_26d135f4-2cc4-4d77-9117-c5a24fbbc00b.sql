-- Fix parameter extraction patterns to work with current function
UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["my name is *", "name is *", "call me *", "i am *", "this is *", "*"]}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'name';

UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["my phone number is *", "phone number is *", "number is *", "call me at *", "contact me at *", "*"], "validation_regex": "\\b\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b|\\b\\(\\d{3}\\)\\s?\\d{3}[-.\\s]?\\d{4}\\b"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'phone_number';

UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["I have *", "have *", "diagnosed with *", "suffering from *", "condition is *", "*"]}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'condition';

UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["*"], "default_value": "qualified"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'qualified';