import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
      return new Response(JSON.stringify({ error: 'Domain parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize domain (lowercase, no trailing slash)
    const normalizedDomain = domain.toLowerCase().trim().replace(/\/$/, '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the database function to get branding by domain
    const { data, error } = await supabase
      .rpc('get_branding_by_domain', { p_domain: normalizedDomain });

    if (error) {
      console.error('Error fetching branding by domain:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch branding' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no data found, domain is not configured or not verified
    if (!data || data.length === 0) {
      return new Response(JSON.stringify({
        found: false,
        message: 'Domain not found or not verified'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const branding = data[0];

    return new Response(JSON.stringify({
      found: true,
      user_id: branding.user_id,
      branding: {
        logo_url: branding.logo_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-branding-by-domain function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
