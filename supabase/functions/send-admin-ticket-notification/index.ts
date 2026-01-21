import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  ticket_id: string;
  ticket_subject: string;
  customer_email: string;
  customer_name: string;
  reply_content: string;
  admin_email: string;
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Sending admin ticket notification...");

    const body: NotificationRequest = await req.json();
    console.log("Admin notification request:", JSON.stringify(body, null, 2));

    const { ticket_id, ticket_subject, customer_email, customer_name, reply_content, admin_email } = body;

    if (!admin_email || !ticket_subject || !reply_content) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: admin_email, ticket_subject, reply_content" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const shortTicketId = ticket_id?.substring(0, 8).toUpperCase() || "N/A";
    const currentYear = new Date().getFullYear();
    const messageTimestamp = formatDate(new Date());
    const escapedReplyContent = escapeHtml(reply_content);
    
    // Admin portal URLs
    const ticketUrl = "https://voxtro.io/support-tickets";
    const inboxUrl = "https://voxtro.io/support-tickets";
    const supportUrl = "https://voxtro.io/support-tickets";

    const emailHtml = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Voxtro | Customer Reply</title>
</head>
<body style="margin:0; padding:0; background-color:#0f0f10; font-family: Arial, Helvetica, sans-serif; color:#e8e8ea;">
  <!-- Preheader (hidden) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    New customer reply on ticket ${shortTicketId} from ${customer_email}.
  </div>
  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0f0f10; padding:28px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <!-- Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:640px; max-width:640px;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#151517; border:1px solid #242428; border-radius:16px;">
                <tr>
                  <td style="padding:18px 18px 16px 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="left" style="vertical-align:middle;">
                          <div style="font-size:12px; color:#b6b6bb; line-height:18px; font-weight:800;">
                            Voxtro Support
                          </div>
                          <div style="font-size:22px; line-height:30px; font-weight:900; color:#ffffff;">
                            New customer reply
                          </div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <div style="font-size:12px; color:#b6b6bb; line-height:18px;">
                            Ticket ID
                          </div>
                          <div style="font-size:13px; color:#ffffff; font-weight:900; line-height:18px;">
                            ${shortTicketId}
                          </div>
                        </td>
                      </tr>
                    </table>
                    <div style="height:12px; line-height:12px;">&nbsp;</div>
                    <div style="font-size:14px; line-height:22px; color:#b6b6bb;">
                      A customer replied to the ticket thread. Review the message below and respond from the support portal.
                    </div>
                    <div style="height:14px; line-height:14px;">&nbsp;</div>
                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="left" style="border-radius:12px; background-color:#e45133;">
                          <a
                            href="${ticketUrl}"
                            style="display:inline-block; padding:12px 16px; font-size:14px; font-weight:900; color:#0f0f10; text-decoration:none; border-radius:12px;"
                            target="_blank"
                          >
                            Open ticket
                          </a>
                        </td>
                        <td style="width:10px;">&nbsp;</td>
                        <td align="left" style="border-radius:12px; border:1px solid #2a2a2f; background-color:#151517;">
                          <a
                            href="${inboxUrl}"
                            style="display:inline-block; padding:12px 16px; font-size:14px; font-weight:700; color:#e8e8ea; text-decoration:none; border-radius:12px;"
                            target="_blank"
                          >
                            Open inbox
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Customer Message -->
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#151517; border:1px solid #242428; border-radius:16px;">
                <tr>
                  <td style="padding:18px;">
                    <div style="font-size:13px; color:#b6b6bb; line-height:18px; font-weight:900;">
                      Customer reply
                    </div>
                    <div style="height:12px; line-height:12px;">&nbsp;</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr>
                        <td style="padding:14px;">
                          <div style="font-size:12px; color:#b6b6bb; line-height:18px;">
                            From <span style="color:#ffffff; font-weight:900;">${customer_name || 'Customer'}</span>
                            (<a href="mailto:${customer_email}" style="color:#e45133; text-decoration:none; font-weight:900;">${customer_email}</a>)
                            • ${messageTimestamp}
                          </div>
                          <div style="height:10px; line-height:10px;">&nbsp;</div>
                          <div style="font-size:13px; line-height:20px; color:#e8e8ea; background:#0f0f10; border:1px solid #2a2a2f; border-radius:12px; padding:12px;">
                            ${escapedReplyContent}
                          </div>
                        </td>
                      </tr>
                    </table>
                    <div style="height:12px; line-height:12px;">&nbsp;</div>
                    <div style="font-size:12px; line-height:18px; color:#8e8e95;">
                      Reply from the portal to ensure the response is added to the ticket thread and visible to the customer.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f0f10;">
                <tr>
                  <td style="padding:10px 8px 0 8px;">
                    <div style="font-size:12px; line-height:18px; color:#8e8e95; text-align:center;">
                      This message was generated automatically by Voxtro Support.
                    </div>
                    <div style="height:10px; line-height:10px;">&nbsp;</div>
                    <div style="text-align:center;">
                      <a href="${ticketUrl}" style="font-size:12px; color:#e45133; text-decoration:none; font-weight:900;" target="_blank">
                        Open ticket
                      </a>
                      <span style="color:#3a3a40; padding:0 10px;">•</span>
                      <a href="${supportUrl}" style="font-size:12px; color:#e45133; text-decoration:none; font-weight:900;" target="_blank">
                        Support center
                      </a>
                    </div>
                    <div style="height:14px; line-height:14px;">&nbsp;</div>
                    <div style="font-size:12px; line-height:18px; color:#8e8e95; text-align:center;">
                      © ${currentYear} Voxtro. All rights reserved.
                    </div>
                    <div style="height:18px; line-height:18px;">&nbsp;</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- /Container -->
      </td>
    </tr>
  </table>
</body>
</html>`;

    console.log("Sending email to admin:", admin_email);

    const emailResponse = await resend.emails.send({
      from: "Voxtro Support <support@voxtro.io>",
      to: [admin_email],
      subject: `Customer Reply: ${ticket_subject} [${shortTicketId}]`,
      html: emailHtml,
    });

    console.log("Admin email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
