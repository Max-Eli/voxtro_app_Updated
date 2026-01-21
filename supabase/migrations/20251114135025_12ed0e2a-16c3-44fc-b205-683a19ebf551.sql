-- Create table for voice assistant call logs
CREATE TABLE public.voice_assistant_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistant_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  call_type TEXT DEFAULT 'inbound',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for call transcripts
CREATE TABLE public.voice_assistant_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.voice_assistant_calls(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for call recordings
CREATE TABLE public.voice_assistant_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.voice_assistant_calls(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_assistant_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_assistant_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_assistant_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_assistant_calls
CREATE POLICY "Customers can view their own assistant calls"
  ON public.voice_assistant_calls
  FOR SELECT
  USING (customer_id = get_current_customer_id());

CREATE POLICY "Users can view calls for their assigned assistants"
  ON public.voice_assistant_calls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_assistants va
      WHERE va.id = voice_assistant_calls.assistant_id
      AND va.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create call logs"
  ON public.voice_assistant_calls
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update call logs"
  ON public.voice_assistant_calls
  FOR UPDATE
  USING (true);

-- RLS Policies for voice_assistant_transcripts
CREATE POLICY "Customers can view transcripts for their calls"
  ON public.voice_assistant_transcripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_assistant_calls vac
      WHERE vac.id = voice_assistant_transcripts.call_id
      AND vac.customer_id = get_current_customer_id()
    )
  );

CREATE POLICY "Users can view transcripts for their assistant calls"
  ON public.voice_assistant_transcripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_assistant_calls vac
      JOIN public.voice_assistants va ON va.id = vac.assistant_id
      WHERE vac.id = voice_assistant_transcripts.call_id
      AND va.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create transcripts"
  ON public.voice_assistant_transcripts
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for voice_assistant_recordings
CREATE POLICY "Customers can view recordings for their calls"
  ON public.voice_assistant_recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_assistant_calls vac
      WHERE vac.id = voice_assistant_recordings.call_id
      AND vac.customer_id = get_current_customer_id()
    )
  );

CREATE POLICY "Users can view recordings for their assistant calls"
  ON public.voice_assistant_recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_assistant_calls vac
      JOIN public.voice_assistants va ON va.id = vac.assistant_id
      WHERE vac.id = voice_assistant_recordings.call_id
      AND va.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create recordings"
  ON public.voice_assistant_recordings
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_voice_calls_customer_id ON public.voice_assistant_calls(customer_id);
CREATE INDEX idx_voice_calls_assistant_id ON public.voice_assistant_calls(assistant_id);
CREATE INDEX idx_voice_calls_started_at ON public.voice_assistant_calls(started_at DESC);
CREATE INDEX idx_voice_transcripts_call_id ON public.voice_assistant_transcripts(call_id);
CREATE INDEX idx_voice_recordings_call_id ON public.voice_assistant_recordings(call_id);