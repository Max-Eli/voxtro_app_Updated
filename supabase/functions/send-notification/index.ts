import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  type: 'chat_started' | 'chat_ended' | 'chat_error';
  chatbotName: string;
  userEmail?: string;
  conversationId?: string;
  errorMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Resend inside handler to ensure env vars are loaded - UPDATED
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    console.log("Checking RESEND_API_KEY:", resendApiKey ? "EXISTS" : "NOT FOUND");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY environment variable is not set");
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    
    const resend = new Resend(resendApiKey);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, type, chatbotName, userEmail, conversationId, errorMessage }: NotificationRequest = await req.json();
    
    console.log(`Processing notification request: ${type} for user ${userId}`);

    // Get user's notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.error('Error fetching notification preferences:', prefsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch preferences' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If no preferences found or the specific notification type is disabled, skip
    if (!preferences) {
      console.log('No notification preferences found for user');
      return new Response(JSON.stringify({ message: 'No preferences found' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const shouldSend = (type === 'chat_started' && preferences.chat_started) ||
                      (type === 'chat_ended' && preferences.chat_ended) ||
                      (type === 'chat_error' && preferences.chat_error);

    if (!shouldSend) {
      console.log(`Notification type ${type} is disabled for user ${userId}`);
      return new Response(JSON.stringify({ message: 'Notification disabled' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get notification email (custom email or user's profile email)
    let emailAddress = userEmail;
    
    // Check if user has a custom notification email set
    if (preferences.notification_email) {
      emailAddress = preferences.notification_email;
    } else if (!emailAddress) {
      // Fall back to user's profile email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError || !profile?.email) {
        console.error('Error fetching user email:', profileError);
        return new Response(JSON.stringify({ error: 'User email not found' }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      emailAddress = profile.email;
    }

    // Prepare email content based on notification type
    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'chat_started':
        subject = `New conversation started with ${chatbotName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Conversation Started</h2>
            <p>A user has just started a new conversation with your chatbot <strong>${chatbotName}</strong>.</p>
            <p style="color: #666; font-size: 14px;">Conversation ID: ${conversationId}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px;">You're receiving this email because you have notifications enabled for new conversations. You can change your notification preferences in your dashboard settings.</p>
          </div>
        `;
        break;

      case 'chat_ended':
        subject = `Conversation ended with ${chatbotName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Conversation Ended</h2>
            <p>A conversation with your chatbot <strong>${chatbotName}</strong> has ended.</p>
            <p style="color: #666; font-size: 14px;">Conversation ID: ${conversationId}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px;">You're receiving this email because you have notifications enabled for ended conversations. You can change your notification preferences in your dashboard settings.</p>
          </div>
        `;
        break;

      case 'chat_error':
        subject = `Error occurred in ${chatbotName}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Chat Error Occurred</h2>
            <p>An error occurred in your chatbot <strong>${chatbotName}</strong>.</p>
            ${errorMessage ? `<p style="background: #f8f9fa; padding: 10px; border-left: 4px solid #e74c3c; margin: 15px 0;"><strong>Error:</strong> ${errorMessage}</p>` : ''}
            <p style="color: #666; font-size: 14px;">Conversation ID: ${conversationId}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px;">You're receiving this email because you have notifications enabled for chat errors. You can change your notification preferences in your dashboard settings.</p>
          </div>
        `;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Voxtro Notifications <notifications@resend.dev>",
      to: [emailAddress],
      subject,
      html: htmlContent,
    });

    console.log("Notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      type,
      recipient: emailAddress 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);