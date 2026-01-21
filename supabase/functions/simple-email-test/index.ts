import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailTestRequest {
  email: string;
  testMessage: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Updated to force redeploy with new secret
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    console.log("RESEND_API_KEY check:", resendApiKey ? "EXISTS" : "NOT FOUND");
    console.log("All env vars:", Object.keys(Deno.env.toObject()));
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY environment variable is not set");
      return new Response(JSON.stringify({ 
        error: "RESEND_API_KEY environment variable is not set",
        availableEnvVars: Object.keys(Deno.env.toObject())
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const resend = new Resend(resendApiKey);
    
    const { email, testMessage }: EmailTestRequest = await req.json();
    
    console.log(`Sending test email to: ${email}`);
    
    const emailResponse = await resend.emails.send({
      from: "Voxtro Test <notifications@resend.dev>",
      to: [email],
      subject: "Test Email from Voxtro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email Successfully Sent!</h2>
          <p>${testMessage}</p>
          <p>If you're seeing this email, your notification system is working correctly.</p>
        </div>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      recipient: email,
      message: "Test email sent successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in simple-email-test function:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);