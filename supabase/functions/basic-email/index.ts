import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, testMessage } = await req.json();
    
    console.log("Attempting to send email to:", email);
    
    // Try using fetch directly to Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer re_GhQZ42Ye_LT8vQGfmevR6i3313KmSZhPc`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Voxtro <notifications@app.voxtro.io>',
        to: [email],
        subject: `Test Email from Voxtro`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Test Email Success!</h2>
            <p><strong>Test message:</strong> ${testMessage}</p>
            <p>Your email notification system is now working correctly!</p>
          </div>
        `,
      }),
    });

    const result = await response.json();
    
    console.log("Resend API response:", result);
    
    if (!response.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: result.id,
      recipient: email 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);