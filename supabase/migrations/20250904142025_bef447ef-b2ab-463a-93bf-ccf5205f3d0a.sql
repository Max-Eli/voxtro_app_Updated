-- Create chatbot_forms table for defining forms
CREATE TABLE public.chatbot_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL,
  form_name TEXT NOT NULL,
  form_title TEXT NOT NULL,
  form_description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trigger_keywords TEXT[] DEFAULT '{}',
  success_message TEXT DEFAULT 'Thank you for submitting the form!'
);

-- Enable RLS
ALTER TABLE public.chatbot_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_forms
CREATE POLICY "Users can create forms for their chatbots" 
ON public.chatbot_forms 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_forms.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can view forms for their chatbots" 
ON public.chatbot_forms 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_forms.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can update forms for their chatbots" 
ON public.chatbot_forms 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_forms.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can delete forms for their chatbots" 
ON public.chatbot_forms 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_forms.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Public can view active forms for active chatbots" 
ON public.chatbot_forms 
FOR SELECT 
USING (is_active = true AND EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_forms.chatbot_id 
  AND chatbots.is_active = true
));

-- Create form_submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL,
  conversation_id UUID,
  submitted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  visitor_id TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted'
);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_submissions
CREATE POLICY "System can create form submissions" 
ON public.form_submissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Chatbot owners can view form submissions" 
ON public.form_submissions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM chatbot_forms cf
  JOIN chatbots cb ON cf.chatbot_id = cb.id
  WHERE cf.id = form_submissions.form_id 
  AND cb.user_id = auth.uid()
));

CREATE POLICY "Customers can view form submissions for assigned chatbots" 
ON public.form_submissions 
FOR SELECT 
USING (
  (auth.jwt() ->> 'is_customer')::boolean = true AND
  EXISTS (
    SELECT 1 FROM chatbot_forms cf
    JOIN customer_chatbot_assignments cca ON cf.chatbot_id = cca.chatbot_id
    JOIN customers c ON cca.customer_id = c.id
    WHERE cf.id = form_submissions.form_id 
    AND c.email = (auth.jwt() ->> 'customer_email')
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_chatbot_forms_updated_at
  BEFORE UPDATE ON public.chatbot_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_chatbot_forms_chatbot_id ON public.chatbot_forms(chatbot_id);
CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_conversation_id ON public.form_submissions(conversation_id);