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

    // Service role client for syncing conversations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { agentId } = await req.json();
    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    console.log('Fetching agent details for:', agentId);

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

    // Fetch agent details from ElevenLabs API
    const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': connection.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('ElevenLabs agent API error:', errorText);
      throw new Error('Failed to fetch agent from ElevenLabs');
    }

    const agentData = await agentResponse.json();
    console.log('Agent data:', JSON.stringify(agentData, null, 2));

    // Fetch phone numbers to get the one assigned to this agent
    let phoneNumber = null;
    try {
      const phoneResponse = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
        method: 'GET',
        headers: {
          'xi-api-key': connection.api_key,
          'Content-Type': 'application/json',
        },
      });

      if (phoneResponse.ok) {
        const phoneData = await phoneResponse.json();
        const phoneNumbers = phoneData.phone_numbers || phoneData || [];
        
        for (const phone of phoneNumbers) {
          const assignedAgentId =
            phone.agent_id ||
            phone.assigned_agent?.agent_id ||
            phone.assignedAgent?.agent_id ||
            phone.assigned_agent_id ||
            null;

          if (assignedAgentId === agentId) {
            phoneNumber = phone.phone_number || phone.phoneNumber || phone.number || phone.e164;
            break;
          }
        }
      }
    } catch (phoneError) {
      console.log('Could not fetch phone numbers:', phoneError);
    }

    // Fetch conversations for this agent from ElevenLabs
    let conversations = [];
    try {
      const conversationsResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': connection.api_key,
          'Content-Type': 'application/json',
        },
      });

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        conversations = conversationsData.conversations || [];
        console.log('Found', conversations.length, 'conversations');

        // Sync conversations to local database for customer access
        for (const conv of conversations) {
          const conversationId = conv.conversation_id;
          const startedAt = conv.start_time_unix_secs 
            ? new Date(conv.start_time_unix_secs * 1000).toISOString()
            : new Date().toISOString();
          const endedAt = conv.end_time_unix_secs
            ? new Date(conv.end_time_unix_secs * 1000).toISOString()
            : null;

          // Upsert conversation
          const { error: upsertError } = await supabaseAdmin
            .from('whatsapp_conversations')
            .upsert({
              id: conversationId,
              agent_id: agentId,
              status: conv.status || 'unknown',
              started_at: startedAt,
              ended_at: endedAt,
              summary: conv.analysis?.summary || null,
              sentiment: conv.analysis?.user_sentiment || null,
            }, { onConflict: 'id' });

          if (upsertError) {
            console.error('Error upserting conversation:', upsertError);
          }
        }
        console.log('Synced', conversations.length, 'conversations to local database');
      }
    } catch (convError) {
      console.log('Could not fetch conversations:', convError);
    }

    // Extract relevant config from agent data
    const config = {
      agent_id: agentData.agent_id,
      name: agentData.name,
      phone_number: phoneNumber,
      conversation_config: agentData.conversation_config || {},
      metadata: agentData.metadata || {},
      platform_settings: agentData.platform_settings || {},
      // Extracted for convenience
      system_prompt: agentData.conversation_config?.agent?.prompt?.prompt || '',
      first_message: agentData.conversation_config?.agent?.first_message || '',
      language: agentData.conversation_config?.agent?.language || 'en',
      voice_id: agentData.conversation_config?.tts?.voice_id || '',
      model_id: agentData.conversation_config?.tts?.model_id || '',
      llm_model: agentData.conversation_config?.agent?.prompt?.llm || '',
      temperature: agentData.conversation_config?.agent?.prompt?.temperature ?? 0.7,
      max_tokens: agentData.conversation_config?.agent?.prompt?.max_tokens ?? -1,
      // Tools/functions
      tools: agentData.conversation_config?.agent?.prompt?.tools || [],
      // Analysis settings
      data_collection: agentData.conversation_config?.agent?.prompt?.data_collection || {},
      // Conversation settings
      max_duration_seconds: agentData.conversation_config?.conversation?.max_duration_seconds,
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        agent: config,
        conversations,
        raw: agentData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching WhatsApp agent:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
