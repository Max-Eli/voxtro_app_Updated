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

    // Get user's voice connection to retrieve their Vapi API key
    const { data: connection, error: connError } = await supabaseClient
      .from('voice_connections')
      .select('api_key, public_key, org_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (connError) {
      console.error('Connection error:', connError);
      throw new Error('Failed to fetch voice connection');
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ 
          error: 'No active voice connection found. Please go to Settings to connect your Vapi account first.',
          needsConnection: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we have a public key, return it
    if (connection.public_key) {
      return new Response(
        JSON.stringify({ 
          success: true,
          publicKey: connection.public_key,
          hasConnection: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no public key, return error asking user to add it
    return new Response(
      JSON.stringify({ 
        error: 'Public key not configured. Please add your Vapi public key in Settings → Voice Connection to enable testing.',
        needsPublicKey: true
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting Vapi credentials:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
