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
      const vapiAssistantId = call.assistantId;

      // Find the assistant - the database ID IS the VAPI assistant ID
      const { data: assistant } = await supabaseClient
        .from('voice_assistants')
        .select('id, user_id')
        .eq('id', vapiAssistantId)
        .single();

      if (!assistant) {
        console.log('Assistant not found for VAPI ID:', vapiAssistantId);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Use the database ID for all our queries
      const assistantId = assistant.id;

      // Find customer assigned to this assistant
      const { data: assignment } = await supabaseClient
        .from('customer_assistant_assignments')
        .select('customer_id')
        .eq('assistant_id', assistantId)
        .limit(1)
        .maybeSingle();

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

      // Insert transcripts if available (batch insert, idempotent)
      if (artifact?.messages && callRecord) {
        console.log('Processing messages:', artifact.messages.length);

        // Only insert if no transcripts exist yet (idempotent — safe for webhook retries)
        const { data: existingTranscripts } = await supabaseClient
          .from('voice_assistant_transcripts')
          .select('id')
          .eq('call_id', callRecord.id)
          .limit(1);

        if (!existingTranscripts || existingTranscripts.length === 0) {
          const transcriptsToInsert: any[] = [];

          for (const msg of artifact.messages) {
            // Normalize role — VAPI uses 'bot', some events use 'ai' or 'assistant'
            const rawRole = msg.role || '';
            let role: string;
            if (['bot', 'assistant', 'ai'].includes(rawRole)) {
              role = 'assistant';
            } else if (['user', 'human', 'customer'].includes(rawRole)) {
              role = 'user';
            } else {
              continue; // skip system/tool messages
            }

            // VAPI may put content in msg.message, msg.content, or msg.text
            const content = msg.message || msg.content || msg.text || '';

            if (content) {
              transcriptsToInsert.push({
                call_id: callRecord.id,
                role,
                content,
                timestamp: msg.time ? new Date(msg.time).toISOString() : new Date().toISOString(),
              });
            }
          }

          if (transcriptsToInsert.length > 0) {
            const { error: transcriptError } = await supabaseClient
              .from('voice_assistant_transcripts')
              .insert(transcriptsToInsert);

            if (transcriptError) {
              console.error('Error inserting transcripts:', transcriptError);
            } else {
              console.log(`Inserted ${transcriptsToInsert.length} transcript messages for call:`, call.id);
            }
          } else {
            console.log('No transcript messages to insert for call:', call.id);
          }
        } else {
          console.log('Transcripts already exist for call, skipping:', call.id);
        }
      }

      // Insert recording if available (idempotent — upsert on call_id)
      if (artifact?.recordingUrl && callRecord) {
        const { error: recError } = await supabaseClient
          .from('voice_assistant_recordings')
          .upsert({ call_id: callRecord.id, recording_url: artifact.recordingUrl }, { onConflict: 'call_id' });

        if (recError) {
          console.error('Error upserting recording:', recError);
        }
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
