-- Create RLS policies to allow customers to view forms and form submissions for their assigned chatbots

-- Policy for customers to view forms from their assigned chatbots
CREATE POLICY "Customers can view forms for assigned chatbots" 
ON public.chatbot_forms 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND 
  chatbot_id IN (
    SELECT cca.chatbot_id 
    FROM public.customer_chatbot_assignments cca
    JOIN public.customers c ON cca.customer_id = c.id
    WHERE c.email = auth.email()
  )
);

-- Policy for customers to view form submissions for their assigned chatbots
CREATE POLICY "Customers can view form submissions for assigned chatbots" 
ON public.form_submissions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
  AND 
  form_id IN (
    SELECT cf.id 
    FROM public.chatbot_forms cf
    JOIN public.customer_chatbot_assignments cca ON cf.chatbot_id = cca.chatbot_id
    JOIN public.customers c ON cca.customer_id = c.id
    WHERE c.email = auth.email()
  )
);