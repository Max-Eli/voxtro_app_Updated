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

    const payload = await req.json();
    console.log('Vapi webhook received:', JSON.stringify(payload, null, 2));

    const { message } = payload;

    // Handle different webhook events
    if (message?.type === 'end-of-call-report') {
      const call = message.call;
      const artifact = message.artifact;
      const assistantId = call.assistantId;

      // Find the user who owns this assistant
      const { data: assistant } = await supabaseClient
        .from('voice_assistants')
        .select('user_id')
        .eq('id', assistantId)
        .single();

      if (!assistant) {
        console.log('Assistant not found:', assistantId);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find customer assigned to this assistant
      const { data: assignment } = await supabaseClient
        .from('customer_assistant_assignments')
        .select('customer_id')
        .eq('assistant_id', assistantId)
        .limit(1)
        .single();

      const customerId = assignment?.customer_id || null;

      // Calculate duration from timestamps if not in costs
      let durationSeconds = call.costs?.find((c: any) => c.type === 'call')?.durationSeconds || 0;
      if (durationSeconds === 0 && call.startedAt && call.endedAt) {
        const startTime = new Date(call.startedAt).getTime();
        const endTime = new Date(call.endedAt).getTime();
        durationSeconds = Math.round((endTime - startTime) / 1000);
      }

      // Upsert call record - update if exists, insert if new
      const { data: callRecord, error: callError } = await supabaseClient
        .from('voice_assistant_calls')
        .upsert({
          id: call.id,
          assistant_id: assistantId,
          customer_id: customerId,
          phone_number: call.customer?.number || call.phoneNumber?.number || null,
          started_at: call.startedAt,
          ended_at: call.endedAt,
          duration_seconds: durationSeconds,
          status: call.status || 'completed',
          call_type: 'inbound',
        }, { onConflict: 'id' })
        .select()
        .single();

      if (callError) {
        console.error('Error upserting call:', callError);
      } else {
        console.log('Call upserted successfully:', call.id, 'Duration:', durationSeconds);
      }

      // Insert transcript if available
      if (artifact?.messages && callRecord) {
        console.log('Processing messages:', artifact.messages.length);
        
        // Vapi uses 'bot' for assistant messages
        for (const msg of artifact.messages) {
          const role = msg.role === 'bot' ? 'assistant' : msg.role;
          
          // Only save user and assistant/bot messages
          if ((role === 'user' || role === 'assistant') && msg.message) {
            console.log('Inserting transcript:', { role, message: msg.message.substring(0, 50) });
            await supabaseClient
              .from('voice_assistant_transcripts')
              .insert({
                call_id: callRecord.id,
                role: role,
                content: msg.message,
                timestamp: msg.time ? new Date(msg.time).toISOString() : new Date().toISOString(),
              });
          }
        }
      }

      // Insert recording if available
      if (artifact?.recordingUrl && callRecord) {
        await supabaseClient
          .from('voice_assistant_recordings')
          .insert({
            call_id: callRecord.id,
            recording_url: artifact.recordingUrl,
          });
      }

      console.log('Call data saved successfully for call:', call.id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
