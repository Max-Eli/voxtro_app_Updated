-- Update extraction patterns to handle direct name/phone input without keywords
UPDATE chatbot_custom_parameters 
SET extraction_rules = jsonb_build_object(
      'patterns', ARRAY[
        -- Existing keyword patterns
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
        'hello my name is *',
        -- New flexible patterns for direct input
        '* [0-9]+',  -- name followed by numbers (phone)
        '*'          -- fallback to capture any text as name
      ],
      'regex', ARRAY[
        -- Extract first word(s) before phone number
        '^([a-zA-Z\s]+)(?=\s*[0-9]{10})',
        -- Extract name from start of message
        '^([a-zA-Z\s]{2,30})'
      ]
    )
WHERE chatbot_id = 'f3b380b8-a265-40d1-b72b-263621e3657a' 
AND parameter_name = 'name';

-- Update phone number extraction to be more flexible
UPDATE chatbot_custom_parameters 
SET extraction_rules = jsonb_build_object(
      'patterns', ARRAY[
        'my number is *',
        'my phone number is *', 
        'number is *',
        'phone number is *',
        'call me at *',
        'reach me at *',
        '* is my number',
        '* is my phone number'
      ],
      'regex', ARRAY[
        -- Extract 10-digit phone numbers anywhere in the message
        '([0-9]{10})',
        '([0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})'
      ]
    )
WHERE chatbot_id = 'f3b380b8-a265-40d1-b72b-263621e3657a' 
AND parameter_name = 'phone_number';