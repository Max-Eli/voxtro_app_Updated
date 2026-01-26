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
    const { email, teamName, inviterName, inviteUrl } = await req.json();

    console.log("Sending team invitation email to:", email);

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "re_GhQZ42Ye_LT8vQGfmevR6i3313KmSZhPc";

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Voxtro <notifications@app.voxtro.io>',
        to: [email],
        subject: `You've been invited to join ${teamName} on Voxtro`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <!-- Logo -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <img src="https://ik.imagekit.io/wrewtbha2/Voxtro%20(1920%20x%201080%20px)%20(3).png" alt="Voxtro" style="height: 48px;" />
                </div>

                <!-- Content -->
                <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                  You're invited to join a team!
                </h1>

                <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                  ${inviterName ? `<strong>${inviterName}</strong> has` : 'You have been'} invited you to join <strong>${teamName}</strong> on Voxtro.
                </p>

                <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 0 0 32px 0; text-align: center;">
                  Join this team to collaborate on tasks, support tickets, voice assistants, and more.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${inviteUrl}" style="display: inline-block; background-color: #e45133; color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                    Accept Invitation
                  </a>
                </div>

                <p style="color: #a1a1aa; font-size: 12px; line-height: 20px; margin: 0; text-align: center;">
                  This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                </p>

                <!-- Link fallback -->
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
                  <p style="color: #71717a; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="color: #3b82f6; font-size: 12px; line-height: 18px; margin: 8px 0 0 0; text-align: center; word-break: break-all;">
                    ${inviteUrl}
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 24px;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Voxtro. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
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
    console.error("Error sending team invitation email:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
