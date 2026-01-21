import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Test the API key by fetching assistants
    const vapiResponse = await fetch('https://api.vapi.ai/assistant?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      console.error('Voice service API error:', errorText);
      
      if (vapiResponse.status === 401) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Invalid API key' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to validate API key');
    }

    const data = await vapiResponse.json();
    
    return new Response(
      JSON.stringify({ 
        valid: true, 
        assistantCount: Array.isArray(data) ? data.length : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating connection:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
