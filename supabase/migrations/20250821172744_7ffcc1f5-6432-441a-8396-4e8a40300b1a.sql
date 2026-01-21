-- Create custom parameters table for chatbots
CREATE TABLE public.chatbot_custom_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL,
  parameter_name TEXT NOT NULL,
  parameter_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'boolean', 'email', 'phone'
  extraction_rules JSONB NOT NULL DEFAULT '{}', -- Rules for extracting this parameter from conversation
  is_required BOOLEAN NOT NULL DEFAULT false, -- Whether parameter is required to trigger email
  validation_rules JSONB DEFAULT '{}', -- Validation rules for the parameter
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chatbot_id, parameter_name)
);

-- Enable RLS
ALTER TABLE public.chatbot_custom_parameters ENABLE ROW LEVEL SECURITY;

-- Create policies for custom parameters
CREATE POLICY "Users can view their chatbot parameters" 
ON public.chatbot_custom_parameters 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_custom_parameters.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can create parameters for their chatbots" 
ON public.chatbot_custom_parameters 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_custom_parameters.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can update their chatbot parameters" 
ON public.chatbot_custom_parameters 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_custom_parameters.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

CREATE POLICY "Users can delete their chatbot parameters" 
ON public.chatbot_custom_parameters 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM chatbots 
  WHERE chatbots.id = chatbot_custom_parameters.chatbot_id 
  AND chatbots.user_id = auth.uid()
));

-- Create conversation parameters table to store extracted parameter values
CREATE TABLE public.conversation_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  parameter_name TEXT NOT NULL,
  parameter_value TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, parameter_name)
);

-- Enable RLS
ALTER TABLE public.conversation_parameters ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation parameters
CREATE POLICY "Chatbot owners can view conversation parameters" 
ON public.conversation_parameters 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversations c 
  JOIN chatbots cb ON c.chatbot_id = cb.id 
  WHERE c.id = conversation_parameters.conversation_id 
  AND cb.user_id = auth.uid()
));

CREATE POLICY "System can create conversation parameters" 
ON public.conversation_parameters 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update conversation parameters" 
ON public.conversation_parameters 
FOR UPDATE 
USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_chatbot_custom_parameters_updated_at
BEFORE UPDATE ON public.chatbot_custom_parameters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_chatbot_custom_parameters_chatbot_id ON public.chatbot_custom_parameters(chatbot_id);
CREATE INDEX idx_conversation_parameters_conversation_id ON public.conversation_parameters(conversation_id);