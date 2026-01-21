-- Add phone_number columns to track Vapi phone numbers
ALTER TABLE public.voice_assistants 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE public.voice_assistant_calls 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_voice_assistants_phone_number 
ON public.voice_assistants(phone_number);

CREATE INDEX IF NOT EXISTS idx_voice_calls_phone_number 
ON public.voice_assistant_calls(phone_number);

-- Update the customer view policy to also check by phone number
DROP POLICY IF EXISTS "Customers can view their assigned voice assistants" ON public.voice_assistants;

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

-- Add policy to allow customers to view calls by phone number too
CREATE POLICY "Customers can view calls by phone number"
  ON public.voice_assistant_calls
  FOR SELECT
  USING (
    customer_id = get_current_customer_id() 
    OR 
    EXISTS (
      SELECT 1 
      FROM public.voice_assistants va
      JOIN public.customer_assistant_assignments caa ON caa.assistant_id = va.id
      JOIN public.customers c ON c.id = caa.customer_id
      WHERE va.phone_number = voice_assistant_calls.phone_number
      AND c.email = auth.email()
    )
  );