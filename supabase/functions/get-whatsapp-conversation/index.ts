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

    const { conversationId } = await req.json();
    if (!conversationId) {
      throw new Error('Conversation ID is required');
    }

    console.log('Fetching conversation details for:', conversationId);

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

    // Fetch conversation details from ElevenLabs API
    const conversationResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': connection.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!conversationResponse.ok) {
      const errorText = await conversationResponse.text();
      console.error('ElevenLabs conversation API error:', errorText);
      throw new Error('Failed to fetch conversation from ElevenLabs');
    }

    const conversationData = await conversationResponse.json();
    console.log('Conversation data retrieved');

    // Extract messages/transcript
    const transcript = conversationData.transcript || [];
    const analysis = conversationData.analysis || {};
    const metadata = conversationData.metadata || {};

    return new Response(
      JSON.stringify({ 
        success: true,
        conversation: {
          id: conversationData.conversation_id,
          agent_id: conversationData.agent_id,
          status: conversationData.status,
          start_time: conversationData.start_time_unix_secs,
          end_time: conversationData.end_time_unix_secs,
          duration_seconds: conversationData.call_duration_secs,
          transcript,
          analysis,
          metadata,
          // Summary and sentiment from analysis
          summary: analysis.summary || null,
          sentiment: analysis.user_sentiment || null,
          data_collected: analysis.data_collection_results || {},
        },
        raw: conversationData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
