-- Add a policy to allow public access to actions for active chatbots
-- This is needed so that visitors can use custom tools when chatting with the bot
CREATE POLICY "Public can view actions for active chatbots" 
ON public.chatbot_actions 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 
    FROM chatbots 
    WHERE chatbots.id = chatbot_actions.chatbot_id 
    AND chatbots.is_active = true
  )
);