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
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('Syncing WhatsApp agents for user:', user.id);

    // Get user's active ElevenLabs connection
    const { data: connection, error: connError } = await supabaseClient
      .from('elevenlabs_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError) {
      console.error('Connection fetch error:', connError);
      throw new Error('Failed to fetch ElevenLabs connection');
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ 
          error: 'No active ElevenLabs connection found. Please connect your account in Settings.',
          needsConnection: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using ElevenLabs connection:', connection.org_name);

    // Fetch agents from ElevenLabs API
    const agentsResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'GET',
      headers: {
        'xi-api-key': connection.api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!agentsResponse.ok) {
      const errorText = await agentsResponse.text();
      console.error('ElevenLabs agents API error:', errorText);
      throw new Error('Failed to fetch agents from ElevenLabs');
    }

    const agentsData = await agentsResponse.json();
    const agents = agentsData.agents || [];
    
    console.log('Found', agents.length, 'agents from ElevenLabs');

    // Fetch phone numbers from ElevenLabs API
    let phoneNumbersMap: Record<string, string> = {};
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
        console.log('Phone numbers response:', JSON.stringify(phoneData));
        
        // Map agent_id to phone_number
        const phoneNumbers = phoneData.phone_numbers || phoneData || [];
        if (Array.isArray(phoneNumbers)) {
          for (const phone of phoneNumbers) {
            const agentId =
              phone.agent_id ||
              phone.assigned_agent?.agent_id ||
              phone.assignedAgent?.agent_id ||
              phone.assigned_agent_id ||
              null;

            const phoneNumber =
              phone.phone_number ||
              phone.phoneNumber ||
              phone.number ||
              phone.e164 ||
              null;

            if (agentId && phoneNumber) {
              phoneNumbersMap[agentId] = phoneNumber;
              console.log('Mapped phone:', agentId, '->', phoneNumber);
            } else {
              console.log('Unmapped phone record (missing agentId/phone):', JSON.stringify(phone));
            }
          }
        }
      } else {
        console.log('Phone numbers endpoint not available or returned error');
      }
    } catch (phoneError) {
      console.log('Could not fetch phone numbers:', phoneError);
    }

    // Sync agents to database
    let syncedCount = 0;
    for (const agent of agents) {
      // Log agent structure for debugging
      console.log('Agent data:', JSON.stringify(agent));
      
      const phoneNumber = phoneNumbersMap[agent.agent_id] || null;
      
      const agentData = {
        id: agent.agent_id,
        user_id: user.id,
        name: agent.name || 'Unnamed Agent',
        phone_number: phoneNumber,
        status: 'active',
      };

      console.log('Upserting agent:', agent.agent_id, 'with phone:', phoneNumber);

      const { error: upsertError } = await supabaseClient
        .from('whatsapp_agents')
        .upsert(agentData, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error upserting agent:', agent.agent_id, upsertError);
      } else {
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'agents successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        count: syncedCount,
        agents: agents.map((a: any) => ({
          id: a.agent_id,
          name: a.name,
          phone_number: phoneNumbersMap[a.agent_id] || null
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing WhatsApp agents:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
