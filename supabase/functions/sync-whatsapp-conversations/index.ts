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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting automatic WhatsApp conversation sync...');

    // Get all active ElevenLabs connections
    const { data: connections, error: connError } = await supabaseAdmin
      .from('elevenlabs_connections')
      .select('*')
      .eq('is_active', true);

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('No active ElevenLabs connections found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active connections' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalSynced = 0;
    let messagesSynced = 0;

    for (const connection of connections) {
      console.log(`Processing connection for user: ${connection.user_id}`);

      // Get all WhatsApp agents for this user
      const { data: agents, error: agentsError } = await supabaseAdmin
        .from('whatsapp_agents')
        .select('id')
        .eq('user_id', connection.user_id);

      if (agentsError) {
        console.error(`Error fetching agents for user ${connection.user_id}:`, agentsError);
        continue;
      }

      for (const agent of agents || []) {
        try {
          // Fetch conversations from ElevenLabs API
          const conversationsResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agent.id}`,
            {
              method: 'GET',
              headers: {
                'xi-api-key': connection.api_key,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!conversationsResponse.ok) {
            console.error(`Failed to fetch conversations for agent ${agent.id}`);
            continue;
          }

          const conversationsData = await conversationsResponse.json();
          const conversations = conversationsData.conversations || [];

          console.log(`Found ${conversations.length} conversations for agent ${agent.id}`);

          // Sync each conversation to local database
          for (const conv of conversations) {
            const conversationId = conv.conversation_id;
            const startedAt = conv.start_time_unix_secs
              ? new Date(conv.start_time_unix_secs * 1000).toISOString()
              : new Date().toISOString();
            const endedAt = conv.end_time_unix_secs
              ? new Date(conv.end_time_unix_secs * 1000).toISOString()
              : null;

            // Check if we already have this conversation with messages
            const { data: existingConv } = await supabaseAdmin
              .from('whatsapp_conversations')
              .select('id')
              .eq('id', conversationId)
              .maybeSingle();

            const { data: existingMessages } = await supabaseAdmin
              .from('whatsapp_messages')
              .select('id')
              .eq('conversation_id', conversationId)
              .limit(1);

            // Log metadata to find phone number location
            console.log(`Conv ${conversationId} metadata:`, JSON.stringify({
              metadata: conv.metadata,
              call_metadata: conv.call_metadata,
              conversation_initiation_client_data: conv.conversation_initiation_client_data,
            }));

            // Extract phone number from various possible locations
            const phoneNumber = conv.metadata?.phone_number || 
                               conv.metadata?.caller_id ||
                               conv.call_metadata?.from_number ||
                               conv.call_metadata?.caller_id ||
                               conv.conversation_initiation_client_data?.phone_number ||
                               conv.conversation_initiation_client_data?.dynamic_variables?.phone_number ||
                               null;

            // Upsert conversation
            const { error: upsertError } = await supabaseAdmin
              .from('whatsapp_conversations')
              .upsert({
                id: conversationId,
                agent_id: agent.id,
                status: conv.status || 'unknown',
                started_at: startedAt,
                ended_at: endedAt,
                summary: conv.analysis?.summary || null,
                sentiment: conv.analysis?.user_sentiment || null,
                phone_number: phoneNumber,
              }, { onConflict: 'id' });

            if (upsertError) {
              console.error(`Error upserting conversation ${conversationId}:`, upsertError);
            } else {
              totalSynced++;
            }

            // Always fetch full conversation details to get phone number and transcripts
            try {
              const detailResponse = await fetch(
                `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
                {
                  method: 'GET',
                  headers: {
                    'xi-api-key': connection.api_key,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                const transcript = detailData.transcript || [];
                
                // Log full detail structure to find phone number location
                console.log(`Detail for ${conversationId}:`, JSON.stringify({
                  metadata: detailData.metadata,
                  call_metadata: detailData.call_metadata,
                  conversation_initiation_client_data: detailData.conversation_initiation_client_data,
                  analysis: detailData.analysis,
                }));
                
                // Extract phone number from various possible locations in detailed response
                // Found in: metadata.whatsapp.whatsapp_user_id or dynamic_variables.system__caller_id
                const detailPhoneNumber = detailData.metadata?.whatsapp?.whatsapp_user_id ||
                                         detailData.conversation_initiation_client_data?.dynamic_variables?.system__caller_id ||
                                         detailData.metadata?.phone_number || 
                                         detailData.metadata?.caller_id ||
                                         detailData.metadata?.from ||
                                         detailData.call_metadata?.from_number ||
                                         detailData.call_metadata?.caller_id ||
                                         detailData.call_metadata?.phone_number ||
                                         detailData.conversation_initiation_client_data?.phone_number ||
                                         detailData.conversation_initiation_client_data?.dynamic_variables?.phone_number ||
                                         detailData.analysis?.data_collection?.phone_number?.value ||
                                         null;
                
                // Update conversation with phone number if found
                if (detailPhoneNumber) {
                  console.log(`Found phone number for ${conversationId}: ${detailPhoneNumber}`);
                  await supabaseAdmin
                    .from('whatsapp_conversations')
                    .update({ phone_number: detailPhoneNumber })
                    .eq('id', conversationId);
                }

                // Only insert messages if we don't already have them
                if (!existingMessages || existingMessages.length === 0) {

                  // Log raw transcript for debugging
                  console.log(`Transcript for ${conversationId}:`, JSON.stringify(transcript.slice(0, 3)));
                  
                  // Insert messages - handle both user and agent messages
                  for (let i = 0; i < transcript.length; i++) {
                    const msg = transcript[i];
                    const messageTime = msg.time_in_call_secs 
                      ? new Date(new Date(startedAt).getTime() + msg.time_in_call_secs * 1000).toISOString()
                      : startedAt;

                    // ElevenLabs uses 'agent' for assistant and 'user' for user
                    // Normalize role to 'assistant' for agent messages for consistency
                    const role = msg.role === 'agent' ? 'assistant' : (msg.role || 'unknown');
                    
                    // Handle different message formats from ElevenLabs
                    const content = msg.message || msg.text || msg.content || '';
                    
                    // Skip empty messages
                    if (!content.trim()) continue;

                    const { error: msgError } = await supabaseAdmin
                      .from('whatsapp_messages')
                      .upsert({
                        id: `${conversationId}_${i}_${msg.time_in_call_secs || 0}`,
                        conversation_id: conversationId,
                        role: role,
                        content: content,
                        timestamp: messageTime,
                        metadata: {
                          time_in_call_secs: msg.time_in_call_secs,
                          original_role: msg.role,
                        },
                      }, { onConflict: 'id' });

                    if (!msgError) {
                      messagesSynced++;
                    } else {
                      console.error(`Error inserting message:`, msgError);
                    }
                  }
                  
                  console.log(`Synced ${transcript.length} messages for conversation ${conversationId}`);
                }
              }
            } catch (detailError) {
              console.error(`Error fetching conversation details for ${conversationId}:`, detailError);
            }
          }
        } catch (agentError) {
          console.error(`Error processing agent ${agent.id}:`, agentError);
        }
      }
    }

    console.log(`Sync complete. Conversations: ${totalSynced}, Messages: ${messagesSynced}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: totalSynced,
        messages: messagesSynced,
        message: `Synced ${totalSynced} conversations and ${messagesSynced} messages` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-whatsapp-conversations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
