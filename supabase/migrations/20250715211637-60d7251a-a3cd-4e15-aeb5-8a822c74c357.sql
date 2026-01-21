-- Create table for chatbot FAQs
CREATE TABLE public.chatbot_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chatbot_faqs ENABLE ROW LEVEL SECURITY;

-- Create policies for FAQ access
CREATE POLICY "Users can view FAQs for their chatbots" 
ON public.chatbot_faqs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chatbots 
  WHERE chatbots.id = chatbot_faqs.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can create FAQs for their chatbots" 
ON public.chatbot_faqs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chatbots 
  WHERE chatbots.id = chatbot_faqs.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can update FAQs for their chatbots" 
ON public.chatbot_faqs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.chatbots 
  WHERE chatbots.id = chatbot_faqs.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can delete FAQs for their chatbots" 
ON public.chatbot_faqs 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.chatbots 
  WHERE chatbots.id = chatbot_faqs.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

-- Public access policy for active FAQs (needed for the widget)
CREATE POLICY "Public can view active FAQs for active chatbots" 
ON public.chatbot_faqs 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.chatbots 
    WHERE chatbots.id = chatbot_faqs.chatbot_id 
    AND chatbots.is_active = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_chatbot_faqs_updated_at
BEFORE UPDATE ON public.chatbot_faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();