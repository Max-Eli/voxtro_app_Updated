-- Add 'whatsapp_agent' to the entity_type check constraint
ALTER TABLE public.changelog_entries DROP CONSTRAINT IF EXISTS changelog_entries_entity_type_check;
ALTER TABLE public.changelog_entries ADD CONSTRAINT changelog_entries_entity_type_check
  CHECK (entity_type IN ('chatbot', 'voice_assistant', 'whatsapp_agent'));

-- Create changelog entries for all existing completed tasks that don't have one yet
-- For tasks with voice assistant assigned
INSERT INTO public.changelog_entries (user_id, entity_type, entity_id, change_type, title, description, status, source, created_at, updated_at)
SELECT
  t.user_id,
  'voice_assistant' as entity_type,
  t.assistant_id as entity_id,
  'update' as change_type,
  t.title,
  t.description,
  'completed' as status,
  'manual' as source,
  t.updated_at as created_at,
  t.updated_at
FROM public.voice_assistant_tasks t
WHERE t.status = 'completed'
  AND t.assistant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.changelog_entries ce
    WHERE ce.entity_id = t.assistant_id
      AND ce.title = t.title
      AND ce.entity_type = 'voice_assistant'
      AND ce.user_id = t.user_id
  );

-- For tasks with chatbot assigned
INSERT INTO public.changelog_entries (user_id, entity_type, entity_id, change_type, title, description, status, source, created_at, updated_at)
SELECT
  t.user_id,
  'chatbot' as entity_type,
  t.chatbot_id as entity_id,
  'update' as change_type,
  t.title,
  t.description,
  'completed' as status,
  'manual' as source,
  t.updated_at as created_at,
  t.updated_at
FROM public.voice_assistant_tasks t
WHERE t.status = 'completed'
  AND t.chatbot_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.changelog_entries ce
    WHERE ce.entity_id = t.chatbot_id
      AND ce.title = t.title
      AND ce.entity_type = 'chatbot'
      AND ce.user_id = t.user_id
  );

-- For tasks with WhatsApp agent assigned
INSERT INTO public.changelog_entries (user_id, entity_type, entity_id, change_type, title, description, status, source, created_at, updated_at)
SELECT
  t.user_id,
  'whatsapp_agent' as entity_type,
  t.whatsapp_agent_id as entity_id,
  'update' as change_type,
  t.title,
  t.description,
  'completed' as status,
  'manual' as source,
  t.updated_at as created_at,
  t.updated_at
FROM public.voice_assistant_tasks t
WHERE t.status = 'completed'
  AND t.whatsapp_agent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.changelog_entries ce
    WHERE ce.entity_id = t.whatsapp_agent_id
      AND ce.title = t.title
      AND ce.entity_type = 'whatsapp_agent'
      AND ce.user_id = t.user_id
  );
