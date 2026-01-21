import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatbotStats {
  id: string;
  name: string;
  conversations_count: number;
  messages_count: number;
  tokens_used: number;
}

interface VoiceAssistantStats {
  id: string;
  name: string;
  phone_number: string | null;
  total_calls: number;
  total_duration_seconds: number;
}

interface WhatsAppAgentStats {
  id: string;
  name: string;
  phone_number: string | null;
  conversations_count: number;
  messages_count: number;
}

interface WeeklyStats {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  
  // Chatbot stats
  chatbots: ChatbotStats[];
  total_chatbot_conversations: number;
  total_chatbot_messages: number;
  total_tokens: number;
  
  // Voice Assistant stats
  voice_assistants: VoiceAssistantStats[];
  total_voice_calls: number;
  total_voice_duration_seconds: number;
  
  // WhatsApp Agent stats
  whatsapp_agents: WhatsAppAgentStats[];
  total_whatsapp_conversations: number;
  total_whatsapp_messages: number;
  
  // Combined totals
  total_interactions: number;
  total_messages: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse optional email filter from request body
    let filterEmail: string | null = null;
    try {
      const body = await req.json();
      filterEmail = body?.email || null;
    } catch {
      // No body or invalid JSON, proceed without filter
    }

    console.log("Starting weekly summary generation...", filterEmail ? `(filtered to ${filterEmail})` : "(all customers)");

    // Get date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Generating reports for ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get customers with weekly summaries enabled (optionally filtered by email)
    let query = supabase
      .from('customers')
      .select('id, email, full_name')
      .eq('weekly_summary_enabled', true);
    
    if (filterEmail) {
      query = query.eq('email', filterEmail);
    }

    const { data: customers, error: customersError } = await query;

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      throw customersError;
    }

    console.log(`Found ${customers?.length || 0} customers with weekly summaries enabled`);

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No customers with weekly summaries enabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const summaries: WeeklyStats[] = [];

    // Generate summary for each customer
    for (const customer of customers) {
      console.log(`Processing customer: ${customer.email}`);
      
      try {
        // ========== CHATBOT DATA ==========
        const { data: chatbotAssignments, error: chatbotAssignmentsError } = await supabase
          .from('customer_chatbot_assignments')
          .select(`
            chatbot_id,
            chatbots (
              id,
              name
            )
          `)
          .eq('customer_id', customer.id);

        if (chatbotAssignmentsError) {
          console.error(`Error fetching chatbot assignments for ${customer.email}:`, chatbotAssignmentsError);
        }

        const chatbotIds = chatbotAssignments?.map(a => a.chatbot_id) || [];
        let chatbotConversations: any[] = [];
        let chatbotMessages: any[] = [];
        let tokenUsage: any[] = [];

        if (chatbotIds.length > 0) {
          // Get conversations from the past week
          const { data: convData, error: convError } = await supabase
            .from('conversations')
            .select('id, chatbot_id, created_at')
            .in('chatbot_id', chatbotIds)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          if (convError) {
            console.error(`Error fetching chatbot conversations for ${customer.email}:`, convError);
          } else {
            chatbotConversations = convData || [];
          }

          const conversationIds = chatbotConversations.map(c => c.id);

          if (conversationIds.length > 0) {
            const { data: msgData, error: msgError } = await supabase
              .from('messages')
              .select('id, conversation_id, conversations!inner(chatbot_id)')
              .in('conversation_id', conversationIds);

            if (msgError) {
              console.error(`Error fetching chatbot messages for ${customer.email}:`, msgError);
            } else {
              chatbotMessages = msgData || [];
            }
          }

          // Get token usage
          const { data: tokenData, error: tokenError } = await supabase
            .from('token_usage')
            .select('chatbot_id, input_tokens, output_tokens')
            .in('chatbot_id', chatbotIds)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          if (tokenError) {
            console.error(`Error fetching token usage for ${customer.email}:`, tokenError);
          } else {
            tokenUsage = tokenData || [];
          }
        }

        // Process chatbot stats
        const chatbotStats: ChatbotStats[] = chatbotAssignments?.map(assignment => {
          const chatbot = assignment.chatbots as any;
          const botConvs = chatbotConversations.filter(c => c.chatbot_id === chatbot.id);
          const botMsgs = chatbotMessages.filter(m => m.conversations?.chatbot_id === chatbot.id);
          const botTokens = tokenUsage.filter(tu => tu.chatbot_id === chatbot.id);
          const totalTokens = botTokens.reduce((sum, tu) => 
            sum + (tu.input_tokens || 0) + (tu.output_tokens || 0), 0);

          return {
            id: chatbot.id,
            name: chatbot.name,
            conversations_count: botConvs.length,
            messages_count: botMsgs.length,
            tokens_used: totalTokens
          };
        }) || [];

        // ========== VOICE ASSISTANT DATA ==========
        const { data: vaAssignments, error: vaAssignmentsError } = await supabase
          .from('customer_assistant_assignments')
          .select(`
            assistant_id,
            voice_assistants (
              id,
              name,
              phone_number
            )
          `)
          .eq('customer_id', customer.id);

        if (vaAssignmentsError) {
          console.error(`Error fetching voice assistant assignments for ${customer.email}:`, vaAssignmentsError);
        }

        const assistantIds = vaAssignments?.map(a => a.assistant_id).filter(Boolean) || [];
        let voiceCalls: any[] = [];

        if (assistantIds.length > 0) {
          const { data: callsData, error: callsError } = await supabase
            .from('voice_assistant_calls')
            .select('id, assistant_id, duration_seconds, status, started_at')
            .in('assistant_id', assistantIds)
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString());

          if (callsError) {
            console.error(`Error fetching voice calls for ${customer.email}:`, callsError);
          } else {
            voiceCalls = callsData || [];
          }
        }

        // Process voice assistant stats
        const voiceAssistantStats: VoiceAssistantStats[] = vaAssignments?.map(assignment => {
          const assistant = assignment.voice_assistants as any;
          const assistantCalls = voiceCalls.filter(c => c.assistant_id === assignment.assistant_id);
          const totalDuration = assistantCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

          return {
            id: assistant.id,
            name: assistant.name || 'Unnamed Assistant',
            phone_number: assistant.phone_number,
            total_calls: assistantCalls.length,
            total_duration_seconds: totalDuration
          };
        }) || [];

        // ========== WHATSAPP AGENT DATA ==========
        const { data: waAssignments, error: waAssignmentsError } = await supabase
          .from('customer_whatsapp_agent_assignments')
          .select(`
            agent_id,
            whatsapp_agents (
              id,
              name,
              phone_number
            )
          `)
          .eq('customer_id', customer.id);

        if (waAssignmentsError) {
          console.error(`Error fetching WhatsApp agent assignments for ${customer.email}:`, waAssignmentsError);
        }

        const waAgentIds = waAssignments?.map(a => a.agent_id) || [];
        let waConversations: any[] = [];
        let waMessages: any[] = [];

        if (waAgentIds.length > 0) {
          const { data: waConvData, error: waConvError } = await supabase
            .from('whatsapp_conversations')
            .select('id, agent_id, started_at')
            .in('agent_id', waAgentIds)
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString());

          if (waConvError) {
            console.error(`Error fetching WhatsApp conversations for ${customer.email}:`, waConvError);
          } else {
            waConversations = waConvData || [];
          }

          const waConvIds = waConversations.map(c => c.id);

          if (waConvIds.length > 0) {
            const { data: waMsgData, error: waMsgError } = await supabase
              .from('whatsapp_messages')
              .select('id, conversation_id')
              .in('conversation_id', waConvIds);

            if (waMsgError) {
              console.error(`Error fetching WhatsApp messages for ${customer.email}:`, waMsgError);
            } else {
              waMessages = waMsgData || [];
            }
          }
        }

        // Process WhatsApp agent stats
        const whatsappAgentStats: WhatsAppAgentStats[] = waAssignments?.map(assignment => {
          const agent = assignment.whatsapp_agents as any;
          const agentConvs = waConversations.filter(c => c.agent_id === assignment.agent_id);
          const agentConvIds = agentConvs.map(c => c.id);
          const agentMsgs = waMessages.filter(m => agentConvIds.includes(m.conversation_id));

          return {
            id: agent.id,
            name: agent.name || 'Unnamed Agent',
            phone_number: agent.phone_number,
            conversations_count: agentConvs.length,
            messages_count: agentMsgs.length
          };
        }) || [];

        // ========== CALCULATE TOTALS ==========
        const totalChatbotConversations = chatbotConversations.length;
        const totalChatbotMessages = chatbotMessages.length;
        const totalTokens = tokenUsage.reduce((sum, tu) => 
          sum + (tu.input_tokens || 0) + (tu.output_tokens || 0), 0);
        
        const totalVoiceCalls = voiceCalls.length;
        const totalVoiceDuration = voiceCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
        
        const totalWhatsAppConversations = waConversations.length;
        const totalWhatsAppMessages = waMessages.length;

        // Check if customer has any connected agents
        const hasAnyAgents = chatbotStats.length > 0 || voiceAssistantStats.length > 0 || whatsappAgentStats.length > 0;

        if (!hasAnyAgents) {
          console.log(`Customer ${customer.email} has no connected agents, skipping...`);
          continue;
        }

        const weeklyStats: WeeklyStats = {
          customer_id: customer.id,
          customer_email: customer.email,
          customer_name: customer.full_name,
          
          chatbots: chatbotStats,
          total_chatbot_conversations: totalChatbotConversations,
          total_chatbot_messages: totalChatbotMessages,
          total_tokens: totalTokens,
          
          voice_assistants: voiceAssistantStats,
          total_voice_calls: totalVoiceCalls,
          total_voice_duration_seconds: totalVoiceDuration,
          
          whatsapp_agents: whatsappAgentStats,
          total_whatsapp_conversations: totalWhatsAppConversations,
          total_whatsapp_messages: totalWhatsAppMessages,
          
          total_interactions: totalChatbotConversations + totalVoiceCalls + totalWhatsAppConversations,
          total_messages: totalChatbotMessages + totalWhatsAppMessages
        };

        summaries.push(weeklyStats);
        console.log(`Generated summary for ${customer.email}: ${chatbotStats.length} chatbots, ${voiceAssistantStats.length} voice assistants, ${whatsappAgentStats.length} WhatsApp agents`);

      } catch (customerError) {
        console.error(`Error processing customer ${customer.email}:`, customerError);
        continue;
      }
    }

    console.log(`Generated ${summaries.length} weekly summaries`);

    // Send emails
    let emailsSent = 0;
    const emailErrors: string[] = [];
    
    for (const summary of summaries) {
      try {
        const emailResponse = await sendWeeklySummaryEmail(summary, startDate, endDate);
        emailsSent++;
        console.log(`Sent weekly summary to ${summary.customer_email}`, {
          id: (emailResponse as any)?.data?.id,
        });
      } catch (error: any) {
        const errorMsg = `Failed to send email to ${summary.customer_email}: ${error.message}`;
        console.error(errorMsg);
        emailErrors.push(errorMsg);
      }

      // Resend rate limit: 2 requests / second
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    return new Response(
      JSON.stringify({ 
        message: `Weekly summaries processed. ${emailsSent} emails sent successfully.`,
        summaries_generated: summaries.length,
        emails_sent: emailsSent,
        errors: emailErrors.length > 0 ? emailErrors : undefined
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-weekly-summary function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

async function sendWeeklySummaryEmail(stats: WeeklyStats, startDate: Date, endDate: Date) {
  const formatDateShort = (date: Date) => date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  const weekRange = `${formatDateShort(startDate)} - ${formatDateShort(endDate)}, ${endDate.getFullYear()}`;
  const year = new Date().getFullYear();

  // Build sections based on what agents the customer has
  const hasChatbots = stats.chatbots.length > 0;
  const hasVoiceAssistants = stats.voice_assistants.length > 0;
  const hasWhatsAppAgents = stats.whatsapp_agents.length > 0;

  // URLs
  const portalUrl = 'https://app.voxtro.io/customer-login';
  const supportUrl = 'mailto:info@voxtro.io';
  const managePrefsUrl = 'https://app.voxtro.io/customer/settings';
  const unsubscribeUrl = 'https://app.voxtro.io/customer/settings';
  const logoUrl = 'https://xjzqrhqqvfnnfexxjled.supabase.co/storage/v1/object/public/assets/voxtro-logo-dark.png';

  // Calculate averages
  const avgCallLength = stats.total_voice_calls > 0 
    ? formatDuration(Math.round(stats.total_voice_duration_seconds / stats.total_voice_calls))
    : '0m';
  const avgWhatsAppMsgsPerConv = stats.total_whatsapp_conversations > 0
    ? (stats.total_whatsapp_messages / stats.total_whatsapp_conversations).toFixed(1)
    : '0';

  // Build chatbot items HTML
  const chatbotItemsHtml = stats.chatbots.map(bot => `
    <tr>
      <td style="padding:12px; font-size:13px; color:#ffffff; border-bottom:1px solid #1c1c20;">
        ${bot.name}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatNumber(bot.conversations_count)}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatNumber(bot.messages_count)}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatNumber(bot.tokens_used)}
      </td>
    </tr>
  `).join('');

  // Build voice assistant items HTML
  const voiceItemsHtml = stats.voice_assistants.map(va => {
    const avgLen = va.total_calls > 0 
      ? formatDuration(Math.round(va.total_duration_seconds / va.total_calls))
      : '0m';
    return `
    <tr>
      <td style="padding:12px; font-size:13px; color:#ffffff; border-bottom:1px solid #1c1c20;">
        ${va.name}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;">
        ${va.phone_number || 'N/A'}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatNumber(va.total_calls)}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatDuration(va.total_duration_seconds)}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${avgLen}
      </td>
    </tr>
  `}).join('');

  // Build WhatsApp agent items HTML
  const whatsappItemsHtml = stats.whatsapp_agents.map(wa => {
    const avgMsgs = wa.conversations_count > 0 
      ? (wa.messages_count / wa.conversations_count).toFixed(1)
      : '0';
    return `
    <tr>
      <td style="padding:12px; font-size:13px; color:#ffffff; border-bottom:1px solid #1c1c20;">
        ${wa.name}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;">
        ${wa.phone_number || 'N/A'}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatNumber(wa.conversations_count)}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${formatNumber(wa.messages_count)}
      </td>
      <td style="padding:12px; font-size:13px; color:#e8e8ea; border-bottom:1px solid #1c1c20;" align="right">
        ${avgMsgs}
      </td>
    </tr>
  `}).join('');

  // Chatbot section
  const chatbotSection = hasChatbots ? `
    <tr>
      <td style="padding:0 0 14px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
          style="background:#151517; border:1px solid #242428; border-radius:16px;">
          <tr>
            <td style="padding:18px;">
              <div style="font-size:13px; color:#b6b6bb; line-height:18px; font-weight:800;">
                🤖 Chatbot Performance
              </div>
              <div style="height:12px; line-height:12px;">&nbsp;</div>
              <!-- Summary KPIs -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:0 8px 10px 0;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Conversations</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_chatbot_conversations)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:0 8px 10px 8px;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Messages</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_chatbot_messages)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:0 0 10px 8px;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Tokens</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_tokens)}</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Per-chatbot breakdown -->
              <div style="height:6px; line-height:6px;">&nbsp;</div>
              <div style="font-size:12px; color:#b6b6bb; font-weight:800; margin:8px 0 10px 0;">
                Per-chatbot breakdown
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="border-collapse:separate; border-spacing:0; background:#101012; border:1px solid #26262b; border-radius:14px; overflow:hidden;">
                <tr>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;">Chatbot</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Conversations</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Messages</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Tokens</td>
                </tr>
                ${chatbotItemsHtml}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Voice Assistant section
  const voiceSection = hasVoiceAssistants ? `
    <tr>
      <td style="padding:0 0 14px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
          style="background:#151517; border:1px solid #242428; border-radius:16px;">
          <tr>
            <td style="padding:18px;">
              <div style="font-size:13px; color:#b6b6bb; line-height:18px; font-weight:800;">
                📞 Voice Assistant Performance
              </div>
              <div style="height:12px; line-height:12px;">&nbsp;</div>
              <!-- Summary KPIs -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:0 8px 10px 0;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Total Calls</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_voice_calls)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:0 8px 10px 8px;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Total Duration</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatDuration(stats.total_voice_duration_seconds)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:0 0 10px 8px;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Avg Call Length</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${avgCallLength}</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Per-assistant breakdown -->
              <div style="height:6px; line-height:6px;">&nbsp;</div>
              <div style="font-size:12px; color:#b6b6bb; font-weight:800; margin:8px 0 10px 0;">
                Per-assistant breakdown
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="border-collapse:separate; border-spacing:0; background:#101012; border:1px solid #26262b; border-radius:14px; overflow:hidden;">
                <tr>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;">Assistant</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;">Phone #</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Calls</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Duration</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Avg Length</td>
                </tr>
                ${voiceItemsHtml}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // WhatsApp Agent section
  const whatsappSection = hasWhatsAppAgents ? `
    <tr>
      <td style="padding:0 0 14px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
          style="background:#151517; border:1px solid #242428; border-radius:16px;">
          <tr>
            <td style="padding:18px;">
              <div style="font-size:13px; color:#b6b6bb; line-height:18px; font-weight:800;">
                💬 WhatsApp Agent Performance
              </div>
              <div style="height:12px; line-height:12px;">&nbsp;</div>
              <!-- Summary KPIs -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:0 8px 10px 0;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Conversations</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_whatsapp_conversations)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:0 8px 10px 8px;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Messages</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_whatsapp_messages)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td style="padding:0 0 10px 8px;" width="33.33%">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                      <tr><td style="padding:14px;">
                        <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Avg Msgs / Conv</div>
                        <div style="font-size:20px; color:#ffffff; font-weight:900; margin-top:4px;">${avgWhatsAppMsgsPerConv}</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Per-agent breakdown -->
              <div style="height:6px; line-height:6px;">&nbsp;</div>
              <div style="font-size:12px; color:#b6b6bb; font-weight:800; margin:8px 0 10px 0;">
                Per-agent breakdown
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="border-collapse:separate; border-spacing:0; background:#101012; border:1px solid #26262b; border-radius:14px; overflow:hidden;">
                <tr>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;">Agent</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;">Phone #</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Conversations</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Messages</td>
                  <td style="padding:12px; font-size:12px; font-weight:900; color:#b6b6bb; border-bottom:1px solid #26262b;" align="right">Avg Msgs</td>
                </tr>
                ${whatsappItemsHtml}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  const emailHtml = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Voxtro | Weekly Agent Summary</title>
</head>
<body style="margin:0; padding:0; background-color:#0f0f10; font-family: Arial, Helvetica, sans-serif; color:#e8e8ea;">
  <!-- Preheader (hidden) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    Your weekly Voxtro agent summary for ${weekRange} is ready.
  </div>

  <!-- Full-width wrapper -->
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
                  <td style="padding:18px 18px 14px 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="left" style="vertical-align:middle;">
                          <div style="font-size:18px; color:#ffffff; font-weight:900; line-height:24px;">
                            Voxtro
                          </div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <div style="font-size:12px; color:#b6b6bb; line-height:18px;">
                            Weekly Summary
                          </div>
                          <div style="font-size:13px; color:#ffffff; font-weight:800; line-height:18px;">
                            ${weekRange}
                          </div>
                        </td>
                      </tr>
                    </table>
                    <div style="height:12px; line-height:12px;">&nbsp;</div>
                    <div style="font-size:22px; line-height:30px; font-weight:900; color:#ffffff;">
                      Your agent performance, at a glance.
                    </div>
                    <div style="font-size:14px; line-height:22px; color:#b6b6bb; margin-top:6px;">
                      Below is a breakdown of overall activity plus performance by channel (chatbot, voice, WhatsApp) for <span style="color:#ffffff; font-weight:700;">${weekRange}</span>.
                    </div>
                    <div style="height:14px; line-height:14px;">&nbsp;</div>
                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="left" style="border-radius:12px; background-color:#e45133;">
                          <a
                            href="${portalUrl}"
                            style="display:inline-block; padding:12px 16px; font-size:14px; font-weight:900; color:#0f0f10; text-decoration:none; border-radius:12px;"
                            target="_blank"
                          >
                            View in portal
                          </a>
                        </td>
                        <td style="width:10px;">&nbsp;</td>
                        <td align="left" style="border-radius:12px; border:1px solid #2a2a2f; background-color:#151517;">
                          <a
                            href="${supportUrl}"
                            style="display:inline-block; padding:12px 16px; font-size:14px; font-weight:700; color:#e8e8ea; text-decoration:none; border-radius:12px;"
                            target="_blank"
                          >
                            Contact support
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 📈 Overall Performance -->
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                style="background:#151517; border:1px solid #242428; border-radius:16px;">
                <tr>
                  <td style="padding:18px;">
                    <div style="font-size:13px; color:#b6b6bb; line-height:18px; font-weight:800;">
                      📈 Overall Performance
                    </div>
                    <div style="height:12px; line-height:12px;">&nbsp;</div>
                    <!-- KPI grid -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding:0 8px 10px 0;" width="50%">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                            style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                            <tr>
                              <td style="padding:14px;">
                                <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Total Interactions</div>
                                <div style="font-size:22px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_interactions)}</div>
                                <div style="font-size:12px; color:#b6b6bb; margin-top:2px;">(conversations + calls)</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding:0 0 10px 8px;" width="50%">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                            style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                            <tr>
                              <td style="padding:14px;">
                                <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Total Messages</div>
                                <div style="font-size:22px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_messages)}</div>
                                <div style="font-size:12px; color:#b6b6bb; margin-top:2px;">(chatbot + WhatsApp)</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 8px 0 0;" width="50%">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                            style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                            <tr>
                              <td style="padding:14px;">
                                <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Call Duration</div>
                                <div style="font-size:22px; color:#ffffff; font-weight:900; margin-top:4px;">${formatDuration(stats.total_voice_duration_seconds)}</div>
                                <div style="font-size:12px; color:#b6b6bb; margin-top:2px;">${hasVoiceAssistants ? '(voice assistants)' : '(no voice assistants connected)'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding:0 0 0 8px;" width="50%">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                            style="background:#101012; border:1px solid #26262b; border-radius:14px;">
                            <tr>
                              <td style="padding:14px;">
                                <div style="font-size:12px; color:#b6b6bb; font-weight:800;">Tokens Used</div>
                                <div style="font-size:22px; color:#ffffff; font-weight:900; margin-top:4px;">${formatNumber(stats.total_tokens)}</div>
                                <div style="font-size:12px; color:#b6b6bb; margin-top:2px;">${hasChatbots ? '(chatbots)' : '(no chatbots connected)'}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${chatbotSection}
          ${voiceSection}
          ${whatsappSection}

          <!-- Footer -->
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f0f10;">
                <tr>
                  <td style="padding:10px 8px 0 8px;">
                    <div style="font-size:12px; line-height:18px; color:#8e8e95; text-align:center;">
                      You're receiving this email because weekly summaries are enabled for your Voxtro account.
                    </div>
                    <div style="height:10px; line-height:10px;">&nbsp;</div>
                    <div style="text-align:center;">
                      <a href="${managePrefsUrl}" style="font-size:12px; color:#e45133; text-decoration:none; font-weight:800;" target="_blank">
                        Manage preferences
                      </a>
                      <span style="color:#3a3a40; padding:0 10px;">•</span>
                      <a href="${unsubscribeUrl}" style="font-size:12px; color:#e45133; text-decoration:none; font-weight:800;" target="_blank">
                        Unsubscribe
                      </a>
                    </div>
                    <div style="height:14px; line-height:14px;">&nbsp;</div>
                    <div style="font-size:12px; line-height:18px; color:#8e8e95; text-align:center;">
                      © ${year} Voxtro. All rights reserved.
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

  const emailResponse = await resend.emails.send({
    from: "Voxtro <notifications@voxtro.io>",
    to: [stats.customer_email],
    subject: `Weekly Agent Summary | ${weekRange}`,
    html: emailHtml,
  });

  if ((emailResponse as any)?.error) {
    const err = (emailResponse as any).error;
    throw new Error(`[Resend ${err.statusCode ?? 'error'}] ${err.message ?? 'Unknown error'}`);
  }

  console.log("Weekly summary email sent:", emailResponse);
  return emailResponse;
}

serve(handler);
