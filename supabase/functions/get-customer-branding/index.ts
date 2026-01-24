import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrandingSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

const defaultBranding: BrandingSettings = {
  logo_url: null,
  primary_color: "#f97316",
  secondary_color: "#ea580c",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Get customer branding function called");

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email || !email.includes("@")) {
      console.log("Invalid or missing email");
      return new Response(
        JSON.stringify(defaultBranding),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Fetching branding for email:", email);

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (customerError) {
      console.error("Error fetching customer:", customerError);
      return new Response(
        JSON.stringify(defaultBranding),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!customer) {
      console.log("Customer not found");
      return new Response(
        JSON.stringify(defaultBranding),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Customer found:", customer.id);

    // Find admin through assignments
    let adminUserId: string | null = null;

    // Try chatbot assignments first
    const { data: chatbotAssignment } = await supabase
      .from("customer_chatbot_assignments")
      .select("assigned_by")
      .eq("customer_id", customer.id)
      .limit(1)
      .maybeSingle();

    if (chatbotAssignment?.assigned_by) {
      adminUserId = chatbotAssignment.assigned_by;
      console.log("Found admin via chatbot assignment:", adminUserId);
    }

    // Try voice assistant assignments
    if (!adminUserId) {
      const { data: voiceAssignment } = await supabase
        .from("customer_assistant_assignments")
        .select("assigned_by")
        .eq("customer_id", customer.id)
        .limit(1)
        .maybeSingle();

      if (voiceAssignment?.assigned_by) {
        adminUserId = voiceAssignment.assigned_by;
        console.log("Found admin via voice assignment:", adminUserId);
      }
    }

    // Try whatsapp agent assignments
    if (!adminUserId) {
      const { data: waAssignment } = await supabase
        .from("customer_whatsapp_agent_assignments")
        .select("assigned_by")
        .eq("customer_id", customer.id)
        .limit(1)
        .maybeSingle();

      if (waAssignment?.assigned_by) {
        adminUserId = waAssignment.assigned_by;
        console.log("Found admin via whatsapp assignment:", adminUserId);
      }
    }

    if (!adminUserId) {
      console.log("No admin found through assignments");
      return new Response(
        JSON.stringify(defaultBranding),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get branding for the admin
    const { data: brandingData, error: brandingError } = await supabase
      .from("branding_settings")
      .select("logo_url, primary_color, secondary_color")
      .eq("user_id", adminUserId)
      .maybeSingle();

    if (brandingError) {
      console.error("Error fetching branding:", brandingError);
      return new Response(
        JSON.stringify(defaultBranding),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (brandingData) {
      console.log("Found branding settings:", brandingData);
      const branding: BrandingSettings = {
        logo_url: brandingData.logo_url,
        primary_color: brandingData.primary_color || defaultBranding.primary_color,
        secondary_color: brandingData.secondary_color || defaultBranding.secondary_color,
      };
      return new Response(
        JSON.stringify(branding),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("No branding settings found for admin");
    return new Response(
      JSON.stringify(defaultBranding),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in get-customer-branding function:", error);
    return new Response(
      JSON.stringify(defaultBranding),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
