import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
    // Initialize Resend inside the handler to ensure env vars are loaded
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    
    console.log("Resend API key found:", resendApiKey ? "Yes" : "No");
    
    const resend = new Resend(resendApiKey);
    
    const { email } = await req.json();
    
    console.log(`Sending test email to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Voxtro <onboarding@resend.dev>",
      to: [email],
      subject: "Test Email - Voxtro Notification System",
      html: `
        <h2>🎉 Test Email Successful!</h2>
        <p>Hello!</p>
        <p>This is a test email from your Voxtro notification system.</p>
        <p>If you're reading this, your Resend API key is working correctly!</p>
        <br>
        <p>Best regards,<br>
        The Voxtro Team</p>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Test email sent successfully",
      emailResponse
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending test email:", error);
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