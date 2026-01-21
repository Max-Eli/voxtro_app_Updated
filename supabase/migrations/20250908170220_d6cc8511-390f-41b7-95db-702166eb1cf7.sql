-- Create customer record for max@voxtro.io
INSERT INTO customers (email, full_name, company_name)
VALUES ('max@voxtro.io', 'Max', 'Voxtro')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  company_name = EXCLUDED.company_name;

-- Assign the customer to the DeSanto Electric chatbot 
INSERT INTO customer_chatbot_assignments (
  customer_id, 
  chatbot_id, 
  assigned_by
)
SELECT 
  c.id,
  'd78ac52b-702d-46f4-bc81-2982c7df5fa4'::uuid,
  '5ad0b7c0-f770-41fc-b30e-ee0cc35d8d09'::uuid
FROM customers c
WHERE c.email = 'max@voxtro.io'
ON CONFLICT (customer_id, chatbot_id) DO NOTHING;