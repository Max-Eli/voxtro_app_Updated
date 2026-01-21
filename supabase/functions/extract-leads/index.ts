import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Parse the JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
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

// Process conversations in parallel batches for speed
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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, sourceType, customerId, forceReanalyze } = await req.json();

    console.log(`Extract leads request - userId: ${userId}, customerId: ${customerId}, sourceType: ${sourceType || 'all'}, forceReanalyze: ${forceReanalyze || false}`);

    const extractedLeads: any[] = [];
    let totalProcessed = 0;
    let skippedAlreadyAnalyzed = 0;
    let validLeadsFound = 0;
    const now = new Date().toISOString();

    // Helper to process a single chatbot conversation
    const processChatbotConv = async (conv: any, chatbot: any, chatbotId: string) => {
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('content, role, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      // Mark as analyzed regardless of outcome
      await supabaseAdmin
        .from('conversations')
        .update({ lead_analyzed_at: now })
        .eq('id', conv.id);

      if (!messages || messages.length === 0) {
        return null;
      }

      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const leadInfo = await analyzeTranscriptForLead(transcript);
      
      console.log(`Chatbot conv ${conv.id}: valid=${leadInfo.is_valid_lead}, confidence=${leadInfo.confidence}, reason=${leadInfo.reason}`);

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
          source_id: chatbotId,
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

    // Helper to process a voice call
    const processVoiceCall = async (call: any, assistant: any, assistantId: string) => {
      const { data: transcripts } = await supabaseAdmin
        .from('voice_assistant_transcripts')
        .select('content, role, timestamp')
        .eq('call_id', call.id)
        .order('timestamp', { ascending: true });

      await supabaseAdmin
        .from('voice_assistant_calls')
        .update({ lead_analyzed_at: now })
        .eq('id', call.id);

      if (!transcripts || transcripts.length === 0) {
        return null;
      }

      let transcript = transcripts.map(t => `${t.role}: ${t.content}`).join('\n');
      if (call.phone_number) {
        transcript = `[Caller phone number from system: ${call.phone_number}]\n\n${transcript}`;
      }
      
      const leadInfo = await analyzeTranscriptForLead(transcript);
      console.log(`Voice call ${call.id}: valid=${leadInfo.is_valid_lead}, confidence=${leadInfo.confidence}, reason=${leadInfo.reason}`);

      if (leadInfo.is_valid_lead && leadInfo.name && leadInfo.phone_number) {
        return {
          source_type: 'voice',
          source_id: assistantId,
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

    // Helper to process a WhatsApp conversation
    const processWhatsAppConv = async (conv: any, agent: any, agentId: string) => {
      const { data: messages } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('content, role, timestamp')
        .eq('conversation_id', conv.id)
        .order('timestamp', { ascending: true });

      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ lead_analyzed_at: now })
        .eq('id', conv.id);

      if (!messages || messages.length === 0) {
        return null;
      }

      let transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      if (conv.phone_number) {
        transcript = `[WhatsApp user phone number: ${conv.phone_number}]\n\n${transcript}`;
      }
      
      const leadInfo = await analyzeTranscriptForLead(transcript);
      console.log(`WhatsApp conv ${conv.id}: valid=${leadInfo.is_valid_lead}, confidence=${leadInfo.confidence}, reason=${leadInfo.reason}`);

      if (leadInfo.is_valid_lead && leadInfo.name && leadInfo.phone_number) {
        return {
          source_type: 'whatsapp',
          source_id: agentId,
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

    // If customerId is provided, only extract from assigned agents
    if (customerId) {
      console.log(`Extracting leads for customer ${customerId} from assigned agents only`);

      // Extract from ASSIGNED chatbots only
      if (!sourceType || sourceType === 'chatbot') {
        console.log('Extracting chatbot leads from assigned chatbots...');
        
        const { data: chatbotAssignments } = await supabaseAdmin
          .from('customer_chatbot_assignments')
          .select('chatbot_id, chatbots!inner(id, name, user_id)')
          .eq('customer_id', customerId);

        if (chatbotAssignments && chatbotAssignments.length > 0) {
          for (const assignment of chatbotAssignments) {
            const chatbot = (assignment as any).chatbots;
            const chatbotId = assignment.chatbot_id;
            
            console.log(`Processing chatbot: ${chatbot.name} (${chatbotId})`);
            
            let query = supabaseAdmin
              .from('conversations')
              .select('id, chatbot_id, created_at, lead_analyzed_at')
              .eq('chatbot_id', chatbotId);
            
            if (!forceReanalyze) {
              query = query.is('lead_analyzed_at', null);
            }
            
            const { data: conversations } = await query;

            if (conversations && conversations.length > 0) {
              const toProcess = forceReanalyze 
                ? conversations 
                : conversations.filter(c => !c.lead_analyzed_at);
              
              skippedAlreadyAnalyzed += conversations.length - toProcess.length;
              totalProcessed += toProcess.length;
              
              console.log(`Processing ${toProcess.length} chatbot conversations in parallel...`);
              
              const results = await processBatch(
                toProcess,
                (conv) => processChatbotConv(conv, chatbot, chatbotId),
                5 // Process 5 at a time
              );
              
              const validLeads = results.filter(r => r !== null);
              validLeadsFound += validLeads.length;
              extractedLeads.push(...validLeads);
            }
          }
        }
      }

      // Extract from ASSIGNED voice assistants only
      if (!sourceType || sourceType === 'voice') {
        console.log('Extracting voice leads from assigned assistants...');
        
        const { data: assistantAssignments } = await supabaseAdmin
          .from('customer_assistant_assignments')
          .select('assistant_id, voice_assistants!inner(id, name, user_id)')
          .eq('customer_id', customerId);

        if (assistantAssignments && assistantAssignments.length > 0) {
          for (const assignment of assistantAssignments) {
            const assistant = (assignment as any).voice_assistants;
            const assistantId = assignment.assistant_id;
            
            console.log(`Processing voice assistant: ${assistant.name} (${assistantId})`);
            
            let query = supabaseAdmin
              .from('voice_assistant_calls')
              .select('id, assistant_id, phone_number, started_at, status, duration_seconds, lead_analyzed_at')
              .eq('assistant_id', assistantId);
            
            if (!forceReanalyze) {
              query = query.is('lead_analyzed_at', null);
            }
            
            const { data: calls } = await query;

            if (calls && calls.length > 0) {
              const toProcess = forceReanalyze 
                ? calls 
                : calls.filter(c => !c.lead_analyzed_at);
              
              skippedAlreadyAnalyzed += calls.length - toProcess.length;
              totalProcessed += toProcess.length;
              
              console.log(`Processing ${toProcess.length} voice calls in parallel...`);
              
              const results = await processBatch(
                toProcess,
                (call) => processVoiceCall(call, assistant, assistantId),
                5
              );
              
              const validLeads = results.filter(r => r !== null);
              validLeadsFound += validLeads.length;
              extractedLeads.push(...validLeads);
            }
          }
        }
      }

      // Extract from ASSIGNED WhatsApp agents only
      if (!sourceType || sourceType === 'whatsapp') {
        console.log('Extracting WhatsApp leads from assigned agents...');
        
        const { data: agentAssignments } = await supabaseAdmin
          .from('customer_whatsapp_agent_assignments')
          .select('agent_id, whatsapp_agents!inner(id, name, user_id)')
          .eq('customer_id', customerId);

        if (agentAssignments && agentAssignments.length > 0) {
          for (const assignment of agentAssignments) {
            const agent = (assignment as any).whatsapp_agents;
            const agentId = assignment.agent_id;
            
            console.log(`Processing WhatsApp agent: ${agent.name} (${agentId})`);
            
            let query = supabaseAdmin
              .from('whatsapp_conversations')
              .select('id, agent_id, phone_number, started_at, summary, sentiment, lead_analyzed_at')
              .eq('agent_id', agentId);
            
            if (!forceReanalyze) {
              query = query.is('lead_analyzed_at', null);
            }
            
            const { data: conversations } = await query;

            if (conversations && conversations.length > 0) {
              const toProcess = forceReanalyze 
                ? conversations 
                : conversations.filter(c => !c.lead_analyzed_at);
              
              skippedAlreadyAnalyzed += conversations.length - toProcess.length;
              totalProcessed += toProcess.length;
              
              console.log(`Processing ${toProcess.length} WhatsApp conversations in parallel...`);
              
              const results = await processBatch(
                toProcess,
                (conv) => processWhatsAppConv(conv, agent, agentId),
                5
              );
              
              const validLeads = results.filter(r => r !== null);
              validLeadsFound += validLeads.length;
              extractedLeads.push(...validLeads);
            }
          }
        }
      }
    } 
    // Admin mode: extract from all agents owned by the user
    else if (userId) {
      console.log(`Extracting leads for admin user ${userId} from all owned agents`);

      // Extract from all chatbots owned by user
      if (!sourceType || sourceType === 'chatbot') {
        console.log('Extracting chatbot leads...');
        
        const { data: chatbots } = await supabaseAdmin
          .from('chatbots')
          .select('id, name, user_id')
          .eq('user_id', userId);

        if (chatbots && chatbots.length > 0) {
          const chatbotIds = chatbots.map(c => c.id);
          
          let query = supabaseAdmin
            .from('conversations')
            .select('id, chatbot_id, created_at, lead_analyzed_at')
            .in('chatbot_id', chatbotIds);
          
          if (!forceReanalyze) {
            query = query.is('lead_analyzed_at', null);
          }
          
          const { data: conversations } = await query;

          if (conversations && conversations.length > 0) {
            const toProcess = forceReanalyze 
              ? conversations 
              : conversations.filter(c => !c.lead_analyzed_at);
            
            skippedAlreadyAnalyzed += conversations.length - toProcess.length;
            totalProcessed += toProcess.length;
            
            console.log(`Processing ${toProcess.length} chatbot conversations in parallel...`);
            
            const results = await processBatch(
              toProcess,
              (conv) => {
                const chatbot = chatbots.find(c => c.id === conv.chatbot_id) || { name: 'Unknown', user_id: userId };
                return processChatbotConv(conv, chatbot, conv.chatbot_id);
              },
              5
            );
            
            const validLeads = results.filter(r => r !== null);
            validLeadsFound += validLeads.length;
            extractedLeads.push(...validLeads);
          }
        }
      }

      // Extract from all voice assistants owned by user
      if (!sourceType || sourceType === 'voice') {
        console.log('Extracting voice leads...');
        
        const { data: assistants } = await supabaseAdmin
          .from('voice_assistants')
          .select('id, name, user_id')
          .eq('user_id', userId);

        if (assistants && assistants.length > 0) {
          const assistantIds = assistants.map(a => a.id);
          
          let query = supabaseAdmin
            .from('voice_assistant_calls')
            .select('id, assistant_id, phone_number, started_at, status, duration_seconds, lead_analyzed_at')
            .in('assistant_id', assistantIds);
          
          if (!forceReanalyze) {
            query = query.is('lead_analyzed_at', null);
          }
          
          const { data: calls } = await query;

          if (calls && calls.length > 0) {
            const toProcess = forceReanalyze 
              ? calls 
              : calls.filter(c => !c.lead_analyzed_at);
            
            skippedAlreadyAnalyzed += calls.length - toProcess.length;
            totalProcessed += toProcess.length;
            
            console.log(`Processing ${toProcess.length} voice calls in parallel...`);
            
            const results = await processBatch(
              toProcess,
              (call) => {
                const assistant = assistants.find(a => a.id === call.assistant_id) || { name: 'Unknown', user_id: userId };
                return processVoiceCall(call, assistant, call.assistant_id);
              },
              5
            );
            
            const validLeads = results.filter(r => r !== null);
            validLeadsFound += validLeads.length;
            extractedLeads.push(...validLeads);
          }
        }
      }

      // Extract from all WhatsApp agents owned by user
      if (!sourceType || sourceType === 'whatsapp') {
        console.log('Extracting WhatsApp leads...');
        
        const { data: agents } = await supabaseAdmin
          .from('whatsapp_agents')
          .select('id, name, user_id')
          .eq('user_id', userId);

        if (agents && agents.length > 0) {
          const agentIds = agents.map(a => a.id);
          
          let query = supabaseAdmin
            .from('whatsapp_conversations')
            .select('id, agent_id, phone_number, started_at, summary, sentiment, lead_analyzed_at')
            .in('agent_id', agentIds);
          
          if (!forceReanalyze) {
            query = query.is('lead_analyzed_at', null);
          }
          
          const { data: conversations } = await query;

          if (conversations && conversations.length > 0) {
            const toProcess = forceReanalyze 
              ? conversations 
              : conversations.filter(c => !c.lead_analyzed_at);
            
            skippedAlreadyAnalyzed += conversations.length - toProcess.length;
            totalProcessed += toProcess.length;
            
            console.log(`Processing ${toProcess.length} WhatsApp conversations in parallel...`);
            
            const results = await processBatch(
              toProcess,
              (conv) => {
                const agent = agents.find(a => a.id === conv.agent_id) || { name: 'Unknown', user_id: userId };
                return processWhatsAppConv(conv, agent, conv.agent_id);
              },
              5
            );
            
            const validLeads = results.filter(r => r !== null);
            validLeadsFound += validLeads.length;
            extractedLeads.push(...validLeads);
          }
        }
      }
    }

    console.log(`Extraction complete: ${totalProcessed} analyzed, ${skippedAlreadyAnalyzed} skipped (already analyzed), ${validLeadsFound} valid leads found`);

    // Save all valid leads to the database
    if (extractedLeads.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('leads')
        .upsert(extractedLeads, {
          onConflict: 'conversation_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error("Error upserting leads:", upsertError);
      } else {
        console.log(`Successfully upserted ${extractedLeads.length} leads`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leads_extracted: extractedLeads.length,
        total_processed: totalProcessed,
        skipped_already_analyzed: skippedAlreadyAnalyzed,
        valid_leads_found: validLeadsFound,
        message: skippedAlreadyAnalyzed > 0 
          ? `Analyzed ${totalProcessed} new conversations (${skippedAlreadyAnalyzed} already analyzed), found ${validLeadsFound} valid leads`
          : `Analyzed ${totalProcessed} conversations, found ${validLeadsFound} valid leads`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Extract leads error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
