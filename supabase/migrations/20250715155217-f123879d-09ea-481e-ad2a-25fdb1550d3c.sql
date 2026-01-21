-- Create actions table for chatbot functions
CREATE TABLE public.chatbot_actions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'calendar_booking', 'email_send', 'webhook_call', etc.
    name TEXT NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL DEFAULT '{}', -- Store action-specific config
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for chatbot actions
CREATE POLICY "Users can view their chatbot actions" 
ON public.chatbot_actions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_actions.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create actions for their chatbots" 
ON public.chatbot_actions 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_actions.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their chatbot actions" 
ON public.chatbot_actions 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_actions.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their chatbot actions" 
ON public.chatbot_actions 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.chatbots 
        WHERE chatbots.id = chatbot_actions.chatbot_id 
        AND chatbots.user_id = auth.uid()
    )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chatbot_actions_updated_at
BEFORE UPDATE ON public.chatbot_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create action execution logs table
CREATE TABLE public.action_execution_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_action_id UUID NOT NULL REFERENCES public.chatbot_actions(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for action logs
ALTER TABLE public.action_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for action execution logs
CREATE POLICY "Users can view their action execution logs" 
ON public.action_execution_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.chatbot_actions ca
        JOIN public.chatbots cb ON ca.chatbot_id = cb.id
        WHERE ca.id = action_execution_logs.chatbot_action_id 
        AND cb.user_id = auth.uid()
    )
);

CREATE POLICY "System can create action execution logs" 
ON public.action_execution_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update action execution logs" 
ON public.action_execution_logs 
FOR UPDATE 
USING (true);