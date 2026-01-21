-- Update RLS policy to allow customers to view calls for their assigned assistants
DROP POLICY IF EXISTS "Customers can view calls by phone number" ON voice_assistant_calls;

CREATE POLICY "Customers can view calls for assigned assistants"
ON voice_assistant_calls
FOR SELECT
USING (
  customer_id = get_current_customer_id()
  OR
  EXISTS (
    SELECT 1
    FROM customer_assistant_assignments caa
    JOIN customers c ON c.id = caa.customer_id
    WHERE caa.assistant_id = voice_assistant_calls.assistant_id
    AND c.email = auth.email()
  )
);