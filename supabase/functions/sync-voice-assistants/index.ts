import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's voice connection
    const { data: connection, error: connError } = await supabaseClient
      .from('voice_connections')
      .select('id, api_key, org_name, org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active voice connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing assistants from DB for change detection
    const { data: existingAssistants } = await supabaseClient
      .from('voice_assistants')
      .select('*')
      .eq('user_id', user.id);

    const existingMap = new Map(existingAssistants?.map(a => [a.id, a]) || []);

    // Fetch assistants from Vapi
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connection.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi API error:', errorText);
      throw new Error('Failed to fetch assistants from voice service');
    }

    const assistants = await vapiResponse.json();

    // Webhook URL for Vapi
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vapi-webhook`;

    const changelogEntries: any[] = [];

    // Sync assistants to database and update webhook
    for (const assistant of assistants) {
      // Update webhook URL if not set or different
      if (assistant.serverUrl !== webhookUrl) {
        await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${connection.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ serverUrl: webhookUrl }),
        });
      }

      const voiceData = assistant.voice || {};
      const modelData = assistant.model || {};
      const transcriberData = assistant.transcriber || {};

      const newData = {
        id: assistant.id,
        user_id: user.id,
        name: assistant.name || 'Unnamed Assistant',
        first_message: assistant.firstMessage,
        voice_provider: voiceData.provider,
        voice_id: voiceData.voiceId,
        model_provider: modelData.provider,
        model: modelData.model,
        transcriber_provider: transcriberData.provider,
        org_id: assistant.orgId,
        phone_number: assistant.phoneNumber?.number || assistant.phoneNumberId || null,
        created_at: assistant.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Detect changes
      const existing = existingMap.get(assistant.id);
      if (existing) {
        const changes: Record<string, any> = {};
        const previousValues: Record<string, any> = {};

        const fieldsToTrack = ['name', 'first_message', 'voice_provider', 'voice_id', 'model_provider', 'model', 'transcriber_provider', 'phone_number'];
        
        for (const field of fieldsToTrack) {
          if (existing[field] !== newData[field as keyof typeof newData]) {
            previousValues[field] = existing[field];
            changes[field] = newData[field as keyof typeof newData];
          }
        }

        if (Object.keys(changes).length > 0) {
          const changedFields = Object.keys(changes).join(', ');
          changelogEntries.push({
            user_id: user.id,
            entity_type: 'voice_assistant',
            entity_id: assistant.id,
            change_type: 'update',
            title: `Configuration updated: ${changedFields}`,
            description: `Detected changes from Vapi sync for assistant "${newData.name}"`,
            previous_values: previousValues,
            new_values: changes,
            status: null,
            source: 'vapi_sync',
          });
          console.log(`📝 Detected changes for assistant ${assistant.id}:`, changedFields);
        }
      } else {
        // New assistant
        changelogEntries.push({
          user_id: user.id,
          entity_type: 'voice_assistant',
          entity_id: assistant.id,
          change_type: 'create',
          title: `Assistant synced: ${newData.name}`,
          description: `New voice assistant "${newData.name}" synced from Vapi`,
          previous_values: {},
          new_values: { name: newData.name, model: newData.model, voice_provider: newData.voice_provider },
          status: null,
          source: 'vapi_sync',
        });
        console.log(`📝 New assistant detected: ${assistant.id}`);
      }

      await supabaseClient
        .from('voice_assistants')
        .upsert(newData, { onConflict: 'id' });

      // Store org_id on voice_connection if not already set (first sync)
      if (assistant.orgId && !connection.org_id) {
        await supabaseClient
          .from('voice_connections')
          .update({ org_id: assistant.orgId })
          .eq('id', connection.id);
        connection.org_id = assistant.orgId; // Update local reference
      }
    }

    // Insert changelog entries
    if (changelogEntries.length > 0) {
      const { error: changelogError } = await supabaseClient
        .from('changelog_entries')
        .insert(changelogEntries);
      
      if (changelogError) {
        console.error('Error inserting changelog entries:', changelogError);
      } else {
        console.log(`✅ Inserted ${changelogEntries.length} changelog entries`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: assistants.length,
        changelogEntriesCreated: changelogEntries.length,
        assistants: assistants.map(a => ({
          id: a.id,
          name: a.name || 'Unnamed Assistant'
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing assistants:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
