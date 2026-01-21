-- Update parameter extraction patterns to be more flexible
UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["*"], "keywords": ["name", "my name", "call me", "i am", "this is"], "regex": "\\b[A-Z][a-z]+ [A-Z][a-z]+\\b"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'name';

UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["*"], "keywords": ["phone", "number", "call", "contact"], "regex": "\\b\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b|\\b\\(\\d{3}\\)\\s?\\d{3}[-.\\s]?\\d{4}\\b"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'phone_number';

UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["I have *", "have *", "* condition", "diagnosed with *", "suffering from *"], "keywords": ["arthritis", "diabetes", "hypertension", "asthma", "copd", "psoriasis", "dermatitis", "urticaria"]}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'condition';

-- For qualified parameter, make it so the AI determines this automatically
UPDATE chatbot_custom_parameters 
SET extraction_rules = '{"patterns": ["*"], "auto_fill": true, "logic": "if condition matches [urticaria,asthma,copd,psoriasis,dermatitis] then qualified else not qualified"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' AND parameter_name = 'qualified';