import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedLead {
  is_valid_lead: boolean;
  name: string | null;
  phone_number: string | null;
  email: string | null;
  confidence: number;
  reason: string;
}

// Use OpenAI to analyze transcript and extract/validate lead information
async function analyzeTranscriptForLead(transcript: string): Promise<ExtractedLead> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not configured");
    return {
      is_valid_lead: false,
      name: null,
      phone_number: null,
      email: null,
      confidence: 0,
      reason: "OpenAI not configured"
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a lead qualification expert. Analyze conversation transcripts to determine if a person is a valid sales lead.

A VALID LEAD must have BOTH:
1. A clear, real person's name (first name at minimum, full name preferred)
2. A valid phone number (at least 10 digits)

Email is optional but should be extracted if present.

IMPORTANT CRITERIA:
- The name must be a real person's name, not a placeholder like "user", "customer", "caller", or generic terms
- The phone number must be explicitly provided in the conversation, not just the caller ID or system metadata
- Names like "test", "asdf", random characters are NOT valid
- Be strict - only mark as valid if you're confident the person intentionally provided their contact info

Respond ONLY with valid JSON in this exact format:
{
  "is_valid_lead": true/false,
  "name": "extracted name or null",
  "phone_number": "extracted phone or null",
  "email": "extracted email or null",
  "confidence": 0-100,
  "reason": "brief explanation"
}`
          },
          {
            role: "user",
            content: `Analyze this conversation transcript and extract lead information:\n\n${transcript.substring(0, 4000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return {
        is_valid_lead: false,
        name: null,
        phone_number: null,
        email: null,
        confidence: 0,
        reason: `OpenAI error: ${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return {
        is_valid_lead: false,
        name: null,
        phone_number: null,
        email: null,
        confidence: 0,
        reason: "No AI response"
      };
    }

    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      const result = JSON.parse(jsonStr);
      return {
        is_valid_lead: result.is_valid_lead === true,
        name: result.name || null,
        phone_number: result.phone_number || null,
        email: result.email || null,
        confidence: result.confidence || 0,
        reason: result.reason || "Unknown"
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      return {
        is_valid_lead: false,
        name: null,
        phone_number: null,
        email: null,
        confidence: 0,
        reason: "Failed to parse AI response"
      };
    }
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return {
      is_valid_lead: false,
      name: null,
      phone_number: null,
      email: null,
      confidence: 0,
      reason: `Error: ${error.message}`
    };
  }
}

// Process items in parallel batches
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("=== Lead extraction cron job started ===");

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const extractedLeads: any[] = [];
    let totalProcessed = 0;
    let validLeadsFound = 0;
    const now = new Date().toISOString();

    // Process chatbot conversations not yet analyzed
    const processChatbotConv = async (conv: any) => {
      const { data: chatbot } = await supabaseAdmin
        .from('chatbots')
        .select('id, name, user_id')
        .eq('id', conv.chatbot_id)
        .single();

      if (!chatbot) return null;

      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('content, role, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      await supabaseAdmin
        .from('conversations')
        .update({ lead_analyzed_at: now })
        .eq('id', conv.id);

      if (!messages || messages.length === 0) return null;

      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const leadInfo = await analyzeTranscriptForLead(transcript);
      
      console.log(`Chatbot conv ${conv.id}: valid=${leadInfo.is_valid_lead}, confidence=${leadInfo.confidence}`);

      if (leadInfo.is_valid_lead && leadInfo.name && leadInfo.phone_number) {
        const { data: params } = await supabaseAdmin
          .from('conversation_parameters')
          .select('parameter_name, parameter_value')
          .eq('conversation_id', conv.id);

        const additionalData: Record<string, string> = {
          ai_confidence: leadInfo.confidence.toString(),
          ai_reason: leadInfo.reason
        };
        
        if (params) {
          for (const p of params) {
            if (p.parameter_value && !['name', 'email', 'phone_number'].includes(p.parameter_name)) {
              additionalData[p.parameter_name] = p.parameter_value;
            }
          }
        }

        return {
          source_type: 'chatbot',
          source_id: chatbot.id,
          source_name: chatbot.name || 'Unknown Chatbot',
          conversation_id: conv.id,
          phone_number: leadInfo.phone_number,
          email: leadInfo.email,
          name: leadInfo.name,
          additional_data: additionalData,
          extracted_at: conv.created_at,
          user_id: chatbot.user_id
        };
      }
      return null;
    };

    // Process voice calls
    const processVoiceCall = async (call: any) => {
      const { data: assistant } = await supabaseAdmin
        .from('voice_assistants')
        .select('id, name, user_id')
        .eq('id', call.assistant_id)
        .single();

      if (!assistant) return null;

      const { data: transcripts } = await supabaseAdmin
        .from('voice_assistant_transcripts')
        .select('content, role, timestamp')
        .eq('call_id', call.id)
        .order('timestamp', { ascending: true });

      await supabaseAdmin
        .from('voice_assistant_calls')
        .update({ lead_analyzed_at: now })
        .eq('id', call.id);

      if (!transcripts || transcripts.length === 0) return null;

      let transcript = transcripts.map(t => `${t.role}: ${t.content}`).join('\n');
      if (call.phone_number) {
        transcript = `[Caller phone number from system: ${call.phone_number}]\n\n${transcript}`;
      }
      
      const leadInfo = await analyzeTranscriptForLead(transcript);
      console.log(`Voice call ${call.id}: valid=${leadInfo.is_valid_lead}, confidence=${leadInfo.confidence}`);

      if (leadInfo.is_valid_lead && leadInfo.name && leadInfo.phone_number) {
        return {
          source_type: 'voice',
          source_id: assistant.id,
          source_name: assistant.name || 'Unknown Assistant',
          conversation_id: call.id,
          phone_number: leadInfo.phone_number,
          email: leadInfo.email,
          name: leadInfo.name,
          additional_data: {
            status: call.status,
            duration_seconds: call.duration_seconds?.toString() || '0',
            ai_confidence: leadInfo.confidence.toString(),
            ai_reason: leadInfo.reason
          },
          extracted_at: call.started_at,
          user_id: assistant.user_id
        };
      }
      return null;
    };

    // Process WhatsApp conversations
    const processWhatsAppConv = async (conv: any) => {
      const { data: agent } = await supabaseAdmin
        .from('whatsapp_agents')
        .select('id, name, user_id')
        .eq('id', conv.agent_id)
        .single();

      if (!agent) return null;

      const { data: messages } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('content, role, timestamp')
        .eq('conversation_id', conv.id)
        .order('timestamp', { ascending: true });

      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ lead_analyzed_at: now })
        .eq('id', conv.id);

      if (!messages || messages.length === 0) return null;

      let transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      if (conv.phone_number) {
        transcript = `[WhatsApp user phone number: ${conv.phone_number}]\n\n${transcript}`;
      }
      
      const leadInfo = await analyzeTranscriptForLead(transcript);
      console.log(`WhatsApp conv ${conv.id}: valid=${leadInfo.is_valid_lead}, confidence=${leadInfo.confidence}`);

      if (leadInfo.is_valid_lead && leadInfo.name && leadInfo.phone_number) {
        return {
          source_type: 'whatsapp',
          source_id: agent.id,
          source_name: agent.name || 'Unknown Agent',
          conversation_id: conv.id,
          phone_number: leadInfo.phone_number,
          email: leadInfo.email,
          name: leadInfo.name,
          additional_data: {
            ...(conv.summary ? { summary: conv.summary } : {}),
            ...(conv.sentiment ? { sentiment: conv.sentiment } : {}),
            ai_confidence: leadInfo.confidence.toString(),
            ai_reason: leadInfo.reason
          },
          extracted_at: conv.started_at,
          user_id: agent.user_id
        };
      }
      return null;
    };

    // Fetch all unanalyzed conversations (limit to 50 per run to avoid timeout)
    const BATCH_LIMIT = 50;

    // Get unanalyzed chatbot conversations
    const { data: chatbotConvs } = await supabaseAdmin
      .from('conversations')
      .select('id, chatbot_id, created_at')
      .is('lead_analyzed_at', null)
      .order('created_at', { ascending: false })
      .limit(BATCH_LIMIT);

    if (chatbotConvs && chatbotConvs.length > 0) {
      console.log(`Processing ${chatbotConvs.length} unanalyzed chatbot conversations...`);
      totalProcessed += chatbotConvs.length;
      
      const results = await processBatch(chatbotConvs, processChatbotConv, 5);
      const validLeads = results.filter(r => r !== null);
      validLeadsFound += validLeads.length;
      extractedLeads.push(...validLeads);
    }

    // Get unanalyzed voice calls
    const { data: voiceCalls } = await supabaseAdmin
      .from('voice_assistant_calls')
      .select('id, assistant_id, phone_number, started_at, status, duration_seconds')
      .is('lead_analyzed_at', null)
      .order('started_at', { ascending: false })
      .limit(BATCH_LIMIT);

    if (voiceCalls && voiceCalls.length > 0) {
      console.log(`Processing ${voiceCalls.length} unanalyzed voice calls...`);
      totalProcessed += voiceCalls.length;
      
      const results = await processBatch(voiceCalls, processVoiceCall, 5);
      const validLeads = results.filter(r => r !== null);
      validLeadsFound += validLeads.length;
      extractedLeads.push(...validLeads);
    }

    // Get unanalyzed WhatsApp conversations
    const { data: whatsappConvs } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, agent_id, phone_number, started_at, summary, sentiment')
      .is('lead_analyzed_at', null)
      .order('started_at', { ascending: false })
      .limit(BATCH_LIMIT);

    if (whatsappConvs && whatsappConvs.length > 0) {
      console.log(`Processing ${whatsappConvs.length} unanalyzed WhatsApp conversations...`);
      totalProcessed += whatsappConvs.length;
      
      const results = await processBatch(whatsappConvs, processWhatsAppConv, 5);
      const validLeads = results.filter(r => r !== null);
      validLeadsFound += validLeads.length;
      extractedLeads.push(...validLeads);
    }

    // Upsert all extracted leads
    if (extractedLeads.length > 0) {
      console.log(`Upserting ${extractedLeads.length} valid leads to database...`);
      
      const { error: upsertError } = await supabaseAdmin
        .from('leads')
        .upsert(extractedLeads, {
          onConflict: 'conversation_id,source_type',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Error upserting leads:', upsertError);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`=== Lead extraction cron job completed in ${duration}ms ===`);
    console.log(`Summary: ${totalProcessed} analyzed, ${validLeadsFound} leads extracted`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalAnalyzed: totalProcessed,
          validLeadsExtracted: validLeadsFound,
          durationMs: duration
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Lead extraction cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
