-- Create a policy to allow public read access to active chatbots for the widget
CREATE POLICY "Public read access for active chatbots" 
ON public.chatbots 
FOR SELECT 
USING (is_active = true);