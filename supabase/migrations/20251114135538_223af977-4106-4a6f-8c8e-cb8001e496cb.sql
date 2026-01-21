-- Add RLS policy for customers to view their assigned voice assistants
CREATE POLICY "Customers can view their assigned voice assistants"
  ON public.voice_assistants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.customer_assistant_assignments caa
      JOIN public.customers c ON c.id = caa.customer_id
      WHERE caa.assistant_id = voice_assistants.id
      AND c.email = auth.email()
    )
  );