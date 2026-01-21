-- Create a table for ElevenLabs connections (similar to voice_connections for Vapi)
CREATE TABLE public.elevenlabs_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_key TEXT NOT NULL,
  org_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.elevenlabs_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own elevenlabs connections" 
ON public.elevenlabs_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own elevenlabs connections" 
ON public.elevenlabs_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own elevenlabs connections" 
ON public.elevenlabs_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own elevenlabs connections" 
ON public.elevenlabs_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_elevenlabs_connections_updated_at
BEFORE UPDATE ON public.elevenlabs_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a table for WhatsApp agents synced from ElevenLabs
CREATE TABLE public.whatsapp_agents (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own whatsapp agents" 
ON public.whatsapp_agents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own whatsapp agents" 
ON public.whatsapp_agents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own whatsapp agents" 
ON public.whatsapp_agents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whatsapp agents" 
ON public.whatsapp_agents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_agents_updated_at
BEFORE UPDATE ON public.whatsapp_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();