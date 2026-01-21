-- Update extraction rules to be more flexible for name and phone number
UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"regex": ["([a-zA-Z\\s]{2,30})\\s+(\\d{10,15})", "([a-zA-Z]+\\s+[a-zA-Z]+)"], "patterns": ["my name is *", "name is *", "call me *", "i am *", "this is *", "*"]}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' 
AND parameter_name = 'name';

UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"regex": ["([a-zA-Z\\s]{2,30})\\s+(\\d{10,15})", "(\\d{10,15})"], "patterns": ["my phone number is *", "phone number is *", "number is *", "call me at *", "contact me at *", "*"], "validation_regex": "\\b\\d{10,15}\\b"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' 
AND parameter_name = 'phone_number';