-- Remove the duplicate action with only 2 parameters (the incomplete one)
DELETE FROM chatbot_actions 
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' 
AND id = 'db216d97-3fcb-49d2-a1bc-95f5a445abc1';

-- Update the correct action to match the original exactly
UPDATE chatbot_actions 
SET configuration = '{"parameters": [{"name": "name", "type": "text", "required": true, "description": "the persons name"}, {"name": "phone_number", "type": "text", "required": true, "description": "the persons phone number"}, {"name": "condition", "type": "text", "required": true, "description": "persons condition"}, {"name": "qualified", "type": "text", "required": true, "description": "if the person has one of the listed conditions mark them as qualified, if they dont have one of the listed conditions mark them as not qualified"}], "webhookUrl": "https://hook.us2.make.com/l31skdrgdt63p2shpdlyb7ssejyf26qq"}'
WHERE chatbot_id = '0d313e03-9096-44ad-ae0e-5019e86b212a' 
AND id = 'c1c3a15d-21bf-42c3-bc3a-6b0de6298b30';