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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { agentId, updates } = await req.json();
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    console.log('Updating agent:', agentId, 'with updates:', JSON.stringify(updates));

    // Get user's active ElevenLabs connection
    const { data: connection, error: connError } = await supabaseClient
      .from('elevenlabs_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !connection) {
      throw new Error('No active ElevenLabs connection found');
    }

    // First fetch the current agent to merge updates
    const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': connection.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!getResponse.ok) {
      throw new Error('Failed to fetch current agent config');
    }

    const currentAgent = await getResponse.json();
    console.log('Current agent config:', JSON.stringify(currentAgent, null, 2));

    // Build the update payload
    const updatePayload: any = {
      conversation_config: currentAgent.conversation_config || {},
    };

    // Update name if provided
    if (updates.name !== undefined) {
      updatePayload.name = updates.name;
    }

    // Update system prompt
    if (updates.system_prompt !== undefined) {
      updatePayload.conversation_config.agent = updatePayload.conversation_config.agent || {};
      updatePayload.conversation_config.agent.prompt = updatePayload.conversation_config.agent.prompt || {};
      updatePayload.conversation_config.agent.prompt.prompt = updates.system_prompt;
    }

    // Update first message
    if (updates.first_message !== undefined) {
      updatePayload.conversation_config.agent = updatePayload.conversation_config.agent || {};
      updatePayload.conversation_config.agent.first_message = updates.first_message;
    }

    // Update language
    if (updates.language !== undefined) {
      updatePayload.conversation_config.agent = updatePayload.conversation_config.agent || {};
      updatePayload.conversation_config.agent.language = updates.language;
    }

    // Update LLM model
    if (updates.llm_model !== undefined) {
      updatePayload.conversation_config.agent = updatePayload.conversation_config.agent || {};
      updatePayload.conversation_config.agent.prompt = updatePayload.conversation_config.agent.prompt || {};
      updatePayload.conversation_config.agent.prompt.llm = updates.llm_model;
    }

    // Update temperature
    if (updates.temperature !== undefined) {
      updatePayload.conversation_config.agent = updatePayload.conversation_config.agent || {};
      updatePayload.conversation_config.agent.prompt = updatePayload.conversation_config.agent.prompt || {};
      updatePayload.conversation_config.agent.prompt.temperature = updates.temperature;
    }

    // Update max tokens
    if (updates.max_tokens !== undefined) {
      updatePayload.conversation_config.agent = updatePayload.conversation_config.agent || {};
      updatePayload.conversation_config.agent.prompt = updatePayload.conversation_config.agent.prompt || {};
      updatePayload.conversation_config.agent.prompt.max_tokens = updates.max_tokens;
    }

    // Update voice ID
    if (updates.voice_id !== undefined) {
      updatePayload.conversation_config.tts = updatePayload.conversation_config.tts || {};
      updatePayload.conversation_config.tts.voice_id = updates.voice_id;
    }

    // Update TTS model
    if (updates.model_id !== undefined) {
      updatePayload.conversation_config.tts = updatePayload.conversation_config.tts || {};
      updatePayload.conversation_config.tts.model_id = updates.model_id;
    }

    // Update max duration
    if (updates.max_duration_seconds !== undefined) {
      updatePayload.conversation_config.conversation = updatePayload.conversation_config.conversation || {};
      updatePayload.conversation_config.conversation.max_duration_seconds = updates.max_duration_seconds;
    }

    console.log('Sending update payload:', JSON.stringify(updatePayload, null, 2));

    // Update the agent via ElevenLabs API
    const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': connection.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('ElevenLabs update API error:', errorText);
      throw new Error(`Failed to update agent: ${errorText}`);
    }

    const updatedAgent = await updateResponse.json();
    console.log('Agent updated successfully');

    // Update local database record
    await supabaseClient
      .from('whatsapp_agents')
      .update({
        name: updates.name || currentAgent.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    return new Response(
      JSON.stringify({ 
        success: true,
        agent: updatedAgent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating WhatsApp agent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
