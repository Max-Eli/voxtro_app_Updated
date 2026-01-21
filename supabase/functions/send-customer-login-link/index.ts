import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LoginLinkRequest {
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Send customer login link function called");
    
    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { email, full_name } = requestBody;
    console.log("Extracted values - email:", email, "full_name:", full_name);

    if (!email || !full_name) {
      throw new Error("Email and full_name are required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    console.log("Using Resend API key (first 10 chars):", resendApiKey.substring(0, 10) + "...");

    // Initialize Resend with the API key
    const resend = new Resend(resendApiKey);
    const loginUrl = `https://app.voxtro.io/customer-login`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin-bottom: 10px;">Chatbot Analytics Access</h1>
          <p style="color: #666; font-size: 16px;">Your customer portal is ready</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1a1a1a; margin-bottom: 15px;">Hello ${full_name},</h2>
          <p style="color: #444; line-height: 1.6; margin-bottom: 20px;">
            You now have access to your chatbot analytics dashboard. Click the button below to sign in and view your chatbot performance data.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Access Your Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            <strong>Your login email:</strong> ${email}
          </p>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <h3 style="color: #1a1a1a; margin-bottom: 15px;">What you can do:</h3>
          <ul style="color: #444; line-height: 1.6; padding-left: 20px;">
            <li>View real-time analytics for your assigned chatbots</li>
            <li>Monitor conversation metrics and performance</li>
            <li>Enable weekly email summaries</li>
            <li>Track usage and engagement trends</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
          <p style="color: #888; font-size: 14px;">
            If you have any questions, please contact your chatbot provider.
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 15px;">
            This email was sent by Voxtro on behalf of your chatbot provider.
          </p>
        </div>
      </div>
    `;

    // Send email using Resend directly
    const emailResponse = await resend.emails.send({
      from: "Voxtro <onboarding@resend.dev>",
      to: [email],
      subject: "Access Your Chatbot Analytics Dashboard",
      html: emailHtml,
    });

    console.log("Login link email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Login link sent successfully",
      emailId: emailResponse.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-customer-login-link function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);