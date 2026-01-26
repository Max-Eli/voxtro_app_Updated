import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorReport {
  error_type: string; // 'edge_function', 'api', 'frontend', 'webhook', 'email'
  error_source: string; // function name or component
  error_message: string;
  error_stack?: string;
  metadata?: Record<string, unknown>;
  severity?: 'error' | 'warning' | 'critical';
}

async function sendToDiscord(webhookUrl: string, error: ErrorReport): Promise<void> {
  const severityColors: Record<string, number> = {
    critical: 0xFF0000, // Red
    error: 0xFFA500,    // Orange
    warning: 0xFFFF00,  // Yellow
  };

  const embed = {
    title: `🚨 ${error.severity?.toUpperCase() || 'ERROR'}: ${error.error_source}`,
    description: error.error_message.substring(0, 2000),
    color: severityColors[error.severity || 'error'],
    fields: [
      {
        name: "Type",
        value: error.error_type,
        inline: true,
      },
      {
        name: "Source",
        value: error.error_source,
        inline: true,
      },
      {
        name: "Timestamp",
        value: new Date().toISOString(),
        inline: true,
      },
    ],
    footer: {
      text: "Voxtro Error Monitor",
    },
  };

  if (error.error_stack) {
    embed.fields.push({
      name: "Stack Trace",
      value: "```" + error.error_stack.substring(0, 1000) + "```",
      inline: false,
    });
  }

  if (error.metadata) {
    embed.fields.push({
      name: "Metadata",
      value: "```json\n" + JSON.stringify(error.metadata, null, 2).substring(0, 1000) + "\n```",
      inline: false,
    });
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

async function sendToCustomWebhook(webhookUrl: string, error: ErrorReport): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      ...error,
    }),
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const error: ErrorReport = await req.json();
    console.log("[Error Report] Received:", error);

    // Validate required fields
    if (!error.error_type || !error.error_source || !error.error_message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Set default severity
    error.severity = error.severity || 'error';

    // Initialize Supabase client with service role to log error
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log error to database
    const { error: dbError } = await supabase
      .from("error_logs")
      .insert({
        error_type: error.error_type,
        error_source: error.error_source,
        error_message: error.error_message,
        error_stack: error.error_stack,
        metadata: error.metadata,
        severity: error.severity,
        notified: false,
      });

    if (dbError) {
      console.error("[Error Report] Failed to log to database:", dbError);
    }

    // Get webhook URLs from environment
    const discordWebhook = Deno.env.get("ERROR_DISCORD_WEBHOOK");
    const customWebhook = Deno.env.get("ERROR_CUSTOM_WEBHOOK");

    const notifications: Promise<void>[] = [];

    // Send to Discord if configured
    if (discordWebhook) {
      console.log("[Error Report] Sending to Discord...");
      notifications.push(
        sendToDiscord(discordWebhook, error).catch((e) => {
          console.error("[Error Report] Discord notification failed:", e);
        })
      );
    }

    // Send to custom webhook if configured
    if (customWebhook) {
      console.log("[Error Report] Sending to custom webhook...");
      notifications.push(
        sendToCustomWebhook(customWebhook, error).catch((e) => {
          console.error("[Error Report] Custom webhook notification failed:", e);
        })
      );
    }

    // Wait for all notifications
    await Promise.all(notifications);

    // Update notified status
    if ((discordWebhook || customWebhook) && !dbError) {
      await supabase
        .from("error_logs")
        .update({ notified: true })
        .eq("error_message", error.error_message)
        .eq("notified", false)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Error reported" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: unknown) {
    console.error("[Error Report] Handler error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to process error report" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
