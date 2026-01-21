-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  source TEXT DEFAULT 'chatbot',
  chatbot_id UUID REFERENCES public.chatbots(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_ticket_messages table for the conversation thread
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent')),
  sender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tickets"
  ON public.support_tickets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true);

-- RLS policies for support_ticket_messages
CREATE POLICY "Users can view messages for their tickets"
  ON public.support_ticket_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages for their tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  ));

CREATE POLICY "System can create messages"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();