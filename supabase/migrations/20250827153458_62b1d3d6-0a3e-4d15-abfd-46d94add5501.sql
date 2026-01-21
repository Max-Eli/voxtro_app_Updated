-- Fix parameter name mismatch and improve extraction patterns
UPDATE chatbot_custom_parameters 
SET parameter_name = 'phone_number',
    extraction_rules = jsonb_build_object(
      'patterns', ARRAY[
        'my number is *',
        'my phone number is *', 
        'number is *',
        'phone number is *',
        'call me at *',
        'reach me at *',
        '* is my number',
        '* is my phone number'
      ]
    )
WHERE chatbot_id = 'f3b380b8-a265-40d1-b72b-263621e3657a' 
AND parameter_name = 'number';

-- Improve name extraction patterns to be more flexible
UPDATE chatbot_custom_parameters 
SET extraction_rules = jsonb_build_object(
      'patterns', ARRAY[
        'name is *',
        'my name is *',
        'call me *',
        'i am *',
        'i''m *',
        'this is *',
        '* is my name',
        'name: *',
        'hi i''m *',
        'hello i''m *',
        'hi my name is *',
        'hello my name is *'
      ]
    )
WHERE chatbot_id = 'f3b380b8-a265-40d1-b72b-263621e3657a' 
AND parameter_name = 'name';