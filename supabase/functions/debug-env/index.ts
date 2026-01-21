import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const envVars = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ? "SET" : "NOT SET",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "SET" : "NOT SET",
      RESEND_API_KEY: Deno.env.get("RESEND_API_KEY") ? "SET" : "NOT SET",
      // Show first 10 chars of RESEND key if it exists
      RESEND_KEY_PREVIEW: Deno.env.get("RESEND_API_KEY")?.substring(0, 10) + "..." || "NOT FOUND"
    };

    console.log("Environment variables check:", envVars);

    return new Response(JSON.stringify({ 
      success: true,
      environment: envVars,
      message: "Environment check complete"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in debug-env function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);