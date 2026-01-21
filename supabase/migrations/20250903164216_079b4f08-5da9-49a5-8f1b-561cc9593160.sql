UPDATE chatbot_custom_parameters 
SET extraction_rules = '{
  "patterns": [
    "I have *", 
    "have *", 
    "diagnosed with *", 
    "suffering from *", 
    "condition is *"
  ],
  "regex": [
    "\\b(urticaria|atopic dermatitis|psoriasis|copd|asthma|arthritis|diabetes|hypertension|allergies|eczema|dermatitis|chronic obstructive pulmonary disease)\\b",
    "I have\\s+(\\w+(?:\\s+\\w+){0,3})",
    "have\\s+(\\w+(?:\\s+\\w+){0,3})",
    "diagnosed with\\s+(\\w+(?:\\s+\\w+){0,3})",
    "suffering from\\s+(\\w+(?:\\s+\\w+){0,3})"
  ]
}' 
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' 
AND parameter_name = 'condition'