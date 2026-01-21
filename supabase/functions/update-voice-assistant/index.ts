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

    const { assistantId, updates } = await req.json();

    if (!assistantId || !updates) {
      throw new Error('Assistant ID and updates are required');
    }

    // Get user's voice connection
    const { data: connection, error: connError } = await supabaseClient
      .from('voice_connections')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active voice connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add webhook URL to updates
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/vapi-webhook`;
    const updatesWithWebhook = {
      ...updates,
      serverUrl: webhookUrl,
    };

    // Update assistant via Vapi API
    const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${connection.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatesWithWebhook),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Vapi API error:', errorText);
      throw new Error('Failed to update assistant');
    }

    const updatedAssistant = await vapiResponse.json();

    // Update local cache
    const voiceData = updatedAssistant.voice || {};
    const modelData = updatedAssistant.model || {};
    const transcriberData = updatedAssistant.transcriber || {};

    await supabaseClient
      .from('voice_assistants')
      .update({
        name: updatedAssistant.name || 'Unnamed Assistant',
        first_message: updatedAssistant.firstMessage,
        voice_provider: voiceData.provider,
        voice_id: voiceData.voiceId,
        model_provider: modelData.provider,
        model: modelData.model,
        transcriber_provider: transcriberData.provider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assistantId)
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        assistant: {
          id: updatedAssistant.id,
          name: updatedAssistant.name,
          firstMessage: updatedAssistant.firstMessage
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating assistant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
