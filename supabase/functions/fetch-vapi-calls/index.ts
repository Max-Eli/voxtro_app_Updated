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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { assistantId } = await req.json();

    if (!assistantId) {
      return new Response(
        JSON.stringify({ error: 'assistantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the assistant to find the owner (user_id)
    const { data: assistant, error: assistantError } = await supabaseClient
      .from('voice_assistants')
      .select('user_id, name')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      console.error('Assistant not found:', assistantError);
      return new Response(
        JSON.stringify({ error: 'Voice assistant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the owner's VAPI API key from voice_connections
    const { data: connection, error: connError } = await supabaseClient
      .from('voice_connections')
      .select('api_key')
      .eq('user_id', assistant.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError || !connection) {
      console.error('No active voice connection found for user:', assistant.user_id);
      return new Response(
        JSON.stringify({ error: 'No active voice connection found for this assistant owner' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ALL calls from VAPI API for this assistant with pagination
    // The database ID IS the VAPI assistant ID
    const vapiCalls: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const batchLimit = 100;

    while (hasMore) {
      const url = cursor
        ? `https://api.vapi.ai/call?assistantId=${assistantId}&limit=${batchLimit}&cursor=${cursor}`
        : `https://api.vapi.ai/call?assistantId=${assistantId}&limit=${batchLimit}`;

      const vapiResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${connection.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!vapiResponse.ok) {
        const errorText = await vapiResponse.text();
        console.error('VAPI API error:', vapiResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calls from voice service' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const responseData = await vapiResponse.json();

      // VAPI returns array directly or object with results/cursor
      if (Array.isArray(responseData)) {
        vapiCalls.push(...responseData);
        hasMore = responseData.length === batchLimit;
        // If VAPI returns just array, use last item ID as cursor
        if (hasMore && responseData.length > 0) {
          cursor = responseData[responseData.length - 1].id;
        }
      } else if (responseData.results) {
        vapiCalls.push(...responseData.results);
        cursor = responseData.nextCursor || null;
        hasMore = !!cursor;
      } else {
        // Single response or unknown format
        if (responseData.id) {
          vapiCalls.push(responseData);
        }
        hasMore = false;
      }
    }

    console.log(`Fetched ${vapiCalls.length} total calls from VAPI for assistant ${assistantId}`);

    // Find customer assigned to this assistant
    const { data: assignment } = await supabaseClient
      .from('customer_assistant_assignments')
      .select('customer_id')
      .eq('assistant_id', assistantId)
      .limit(1)
      .maybeSingle();

    const customerId = assignment?.customer_id || null;

    // Sync calls to database
    const syncedCalls = [];
    for (const call of vapiCalls) {
      // Calculate duration
      let durationSeconds = 0;
      if (call.startedAt && call.endedAt) {
        const startTime = new Date(call.startedAt).getTime();
        const endTime = new Date(call.endedAt).getTime();
        durationSeconds = Math.round((endTime - startTime) / 1000);
      }

      const callData = {
        id: call.id,
        assistant_id: assistantId,
        customer_id: customerId,
        phone_number: call.customer?.number || call.phoneNumber?.number || null,
        started_at: call.startedAt,
        ended_at: call.endedAt || null,
        duration_seconds: durationSeconds,
        status: call.status || 'completed',
        call_type: call.type || 'inbound',
      };

      // Upsert call record
      const { data: upsertedCall, error: upsertError } = await supabaseClient
        .from('voice_assistant_calls')
        .upsert(callData, { onConflict: 'id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Error upserting call:', call.id, upsertError);
      } else {
        syncedCalls.push(upsertedCall);

        // If call has transcript/messages, sync those too
        if (call.artifact?.messages) {
          for (const msg of call.artifact.messages) {
            const role = msg.role === 'bot' ? 'assistant' : msg.role;

            if ((role === 'user' || role === 'assistant') && msg.message) {
              // Check if transcript already exists to avoid duplicates
              const { data: existingTranscript } = await supabaseClient
                .from('voice_assistant_transcripts')
                .select('id')
                .eq('call_id', call.id)
                .eq('content', msg.message)
                .eq('role', role)
                .maybeSingle();

              if (!existingTranscript) {
                await supabaseClient
                  .from('voice_assistant_transcripts')
                  .insert({
                    call_id: call.id,
                    role: role,
                    content: msg.message,
                    timestamp: msg.time ? new Date(msg.time).toISOString() : call.startedAt,
                  });
              }
            }
          }
        }

        // Sync recording if available
        if (call.artifact?.recordingUrl) {
          const { data: existingRecording } = await supabaseClient
            .from('voice_assistant_recordings')
            .select('id')
            .eq('call_id', call.id)
            .maybeSingle();

          if (!existingRecording) {
            await supabaseClient
              .from('voice_assistant_recordings')
              .insert({
                call_id: call.id,
                recording_url: call.artifact.recordingUrl,
              });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalFromVapi: vapiCalls.length,
        syncedCount: syncedCalls.length,
        assistantName: assistant.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching VAPI calls:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
