import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = 'https://atmwldssfrbmcluvmelm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bXdsZHNzZnJibWNsdXZtZWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODI3MTQsImV4cCI6MjA2ODE1ODcxNH0.XDRMNQKJVHPegWtLlT9qYcpuNxrllyv2NuMGpek4J1k';

// Token counting helper function
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Calculate cost based on model and tokens
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  };
  
  const rates = pricing[model] || pricing['gpt-4o-mini'];
  return ((inputTokens * rates.input) + (outputTokens * rates.output)) / 1000;
}

// Create hash for cache key
function createQuestionHash(question: string): string {
  const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ');
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

serve(async (req) => {
  console.log('Chat function called - Start');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log('Processing chat request');

  let chatbot;
  let chatbotOwnerUserId;
  let conversationId;

  try {
    const { chatbotId, messages, visitorId, conversationId: passedConversationId, preview, previewConfig } = await req.json();

    if (!chatbotId || !messages || !Array.isArray(messages)) {
      throw new Error('Missing required fields: chatbotId, messages');
    }

    console.log('Chat request for chatbot:', chatbotId);
    console.log('Request payload received:', JSON.stringify({
      chatbotId,
      messages: messages?.length || 0,
      visitorId,
      conversationId: passedConversationId,
      preview
    }, null, 2));

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    // Get chatbot configuration (for preview, use provided config but still load actions)
    if (preview && previewConfig) {
      console.log('Using preview configuration');
      
      // Get active actions for this chatbot even in preview mode
      const { data: actions, error: actionsError } = await supabase
        .from('chatbot_actions')
        .select('id, action_type, name, description, configuration, is_active')
        .eq('chatbot_id', chatbotId)
        .eq('is_active', true);
      
      console.log('Preview mode: Found actions:', actions?.length || 0);
      if (actionsError) {
        console.error('Preview mode: Error loading actions:', actionsError);
      }
      
      chatbot = {
        name: 'Preview',
        system_prompt: previewConfig.system_prompt,
        model: previewConfig.model,
        temperature: previewConfig.temperature,
        max_tokens: previewConfig.max_tokens,
        is_active: true,
        actions: actions || []
      };
    } else {
      const { data: chatbotData, error: chatbotError } = await supabase
        .from('chatbots')
        .select('*, daily_token_limit, monthly_token_limit, cache_enabled, cache_duration_hours')
        .eq('id', chatbotId)
        .single();

      // Get active actions for this chatbot
      const { data: actions, error: actionsError } = await supabase
        .from('chatbot_actions')
        .select('id, action_type, name, description, configuration, is_active')
        .eq('chatbot_id', chatbotId)
        .eq('is_active', true);

      if (chatbotError || !chatbotData) {
        throw new Error('Chatbot not found or inactive');
      }
      
      if (!chatbotData.is_active) {
        throw new Error('Chatbot not found or inactive');
      }
      
      chatbot = {
        ...chatbotData,
        actions: actions || []
      };
    }

    console.log('Found chatbot:', chatbot.name);

    // Handle conversation tracking (skip for preview)
    let isNewConversation = false;
    let conversationHistory = [];
    
    if (!preview && visitorId) {
      // Get chatbot owner for notifications
      const { data: chatbotOwner } = await supabase
        .from('chatbots')
        .select('user_id')
        .eq('id', chatbotId)
        .single();
      
      chatbotOwnerUserId = chatbotOwner?.user_id;
      
      // Use passed conversationId first, then try to find by visitorId
      if (passedConversationId) {
        console.log('Using passed conversationId:', passedConversationId);
        conversationId = passedConversationId;
      } else if (visitorId) {
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('chatbot_id', chatbotId)
          .eq('visitor_id', visitorId)
          .neq('status', 'ended')
          .single();

        if (existingConversation) {
          conversationId = existingConversation.id;
        }
      }

      if (!conversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert([{
            chatbot_id: chatbotId,
            visitor_id: visitorId || `anon_${Date.now()}`
          }])
          .select('id')
          .single();

        if (convError) {
          console.error('Failed to create conversation:', convError);
          throw new Error('Failed to create conversation');
        }
        conversationId = newConversation.id;
        isNewConversation = true;
        
        // Send notification for new chat started
        if (chatbotOwnerUserId) {
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                userId: chatbotOwnerUserId,
                type: 'chat_started',
                chatbotName: chatbot.name,
                conversationId: conversationId
              }
            });
          } catch (notificationError) {
            console.error('Failed to send chat started notification:', notificationError);
            // Don't fail the main request for notification errors
          }
        }
      }
    }
    
    // Load conversation history if conversation exists (outside the visitorId check)
    if (!preview && conversationId) {
      console.log('Loading conversation history for conversation:', conversationId);
      const { data: historyData, error: historyError } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20); // Limit to last 20 messages to avoid token limits
      
      if (!historyError && historyData && historyData.length > 0) {
        conversationHistory = historyData.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        console.log('Loaded', conversationHistory.length, 'previous messages');
      } else if (historyError) {
        console.error('Error loading conversation history:', historyError);
      }
    }

    // Save user message (skip for preview)
    if (!preview && conversationId) {
      const userMessage = messages[messages.length - 1];
      if (userMessage.role === 'user') {
        await supabase
          .from('messages')
          .insert([{
            conversation_id: conversationId,
            role: 'user',
            content: userMessage.content
          }]);
      }
    }

    // Check token limits (skip for preview)
    if (!preview && chatbot.daily_token_limit && chatbot.monthly_token_limit) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Check daily and monthly token usage
      const { data: tokenUsage } = await supabase
        .from('token_usage')
        .select('input_tokens, output_tokens')
        .eq('chatbot_id', chatbotId)
        .gte('created_at', todayStart.toISOString());

      const { data: monthlyUsage } = await supabase
        .from('token_usage')
        .select('input_tokens, output_tokens')
        .eq('chatbot_id', chatbotId)
        .gte('created_at', monthStart.toISOString());

      const dailyTokens = tokenUsage?.reduce((sum, usage) => sum + usage.input_tokens + usage.output_tokens, 0) || 0;
      const monthlyTokens = monthlyUsage?.reduce((sum, usage) => sum + usage.input_tokens + usage.output_tokens, 0) || 0;

      if (dailyTokens >= chatbot.daily_token_limit) {
        return new Response(JSON.stringify({ 
          error: 'Daily token limit reached. Please try again tomorrow.',
          conversationId 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (monthlyTokens >= chatbot.monthly_token_limit) {
        return new Response(JSON.stringify({ 
          error: 'Monthly token limit reached. Please upgrade your plan.',
          conversationId 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check cache for similar responses (skip for preview or when we have conversation history)
    let cacheHit = false;
    if (!preview && chatbot.cache_enabled && messages.length > 0 && conversationHistory.length === 0) {
      const userMessage = messages[messages.length - 1];
      if (userMessage && userMessage.role === 'user') {
        const questionHash = createQuestionHash(userMessage.content);
        
        // Clean up expired cache entries first
        await supabase
          .from('response_cache')
          .delete()
          .lt('expires_at', new Date().toISOString());

        // Look for cached response
        const { data: cachedResponse } = await supabase
          .from('response_cache')
          .select('*')
          .eq('chatbot_id', chatbotId)
          .eq('question_hash', questionHash)
          .eq('model_used', chatbot.model)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (cachedResponse) {
          console.log('Cache hit found for question:', userMessage.content.substring(0, 50));
          
          // Update hit count
          await supabase
            .from('response_cache')
            .update({ 
              hit_count: cachedResponse.hit_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', cachedResponse.id);

          // Log token usage with cache hit
          await supabase
            .from('token_usage')
            .insert({
              chatbot_id: chatbotId,
              conversation_id: conversationId,
              model_used: chatbot.model,
              input_tokens: cachedResponse.input_tokens,
              output_tokens: cachedResponse.output_tokens,
              total_cost: calculateCost(chatbot.model, cachedResponse.input_tokens, cachedResponse.output_tokens),
              cache_hit: true,
            });

          // Save AI response (skip for preview)
          if (conversationId) {
            await supabase
              .from('messages')
              .insert([{
                conversation_id: conversationId,
                role: 'assistant',
                content: cachedResponse.response_text
              }]);
          }

          return new Response(JSON.stringify({ 
            response: cachedResponse.response_text,
            conversationId,
            cached: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Check for FAQ matches (skip for preview)
    if (!preview) {
      const userMessage = messages[messages.length - 1];
      if (userMessage && userMessage.role === 'user') {
        // Get FAQs for this chatbot
        const { data: faqs, error: faqsError } = await supabase
          .from('chatbot_faqs')
          .select('question, answer')
          .eq('chatbot_id', chatbotId)
          .eq('is_active', true);

        if (!faqsError && faqs && faqs.length > 0) {
          // Check if user message matches any FAQ question (case-insensitive, exact match)
          const userQuestion = userMessage.content.trim().toLowerCase();
          const matchedFaq = faqs.find(faq => 
            faq.question.toLowerCase() === userQuestion && faq.answer
          );

          if (matchedFaq) {
            console.log('FAQ match found:', matchedFaq.question);
            
            // Save AI response (skip for preview)
            if (conversationId) {
              await supabase
                .from('messages')
                .insert([{
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: matchedFaq.answer
                }]);
            }

            return new Response(JSON.stringify({ 
              response: matchedFaq.answer,
              conversationId 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // Check for form triggers (skip for preview)
    if (!preview) {
      const userMessage = messages[messages.length - 1];
      if (userMessage && userMessage.role === 'user') {
        const userMessageLower = userMessage.content.toLowerCase();
        
        // Get active forms for this chatbot
        const { data: forms, error: formsError } = await supabase
          .from('chatbot_forms')
          .select('*')
          .eq('chatbot_id', chatbotId)
          .eq('is_active', true);

        if (!formsError && forms && forms.length > 0) {
          // Check if user message contains any form trigger keywords
          const matchedForm = forms.find(form => 
            form.trigger_keywords && form.trigger_keywords.some(keyword => 
              userMessageLower.includes(keyword.toLowerCase())
            )
          );

          if (matchedForm) {
            console.log('Form trigger match found:', matchedForm.form_name);
            
            // Save AI response with form data (skip for preview)
            if (conversationId) {
              await supabase
                .from('messages')
                .insert([{
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: `I'd be happy to help you with that! Please fill out this form:`
                }]);
            }

            return new Response(JSON.stringify({ 
              response: `I'd be happy to help you with that! Please fill out this form:`,
              conversationId,
              formData: {
                id: matchedForm.id,
                form_title: matchedForm.form_title,
                form_description: matchedForm.form_description,
                fields: matchedForm.fields,
                success_message: matchedForm.success_message,
                terms_and_conditions: matchedForm.terms_and_conditions,
                require_terms_acceptance: matchedForm.require_terms_acceptance || false
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }

    // Build the system prompt - START WITH USER'S CUSTOM PROMPT
    let systemPrompt = chatbot.system_prompt || 'You are a helpful assistant.';
    
    // Add formatting and conversational tone instructions
    systemPrompt += `\n\n--- RESPONSE FORMATTING RULES (strictly follow these) ---
- NEVER use markdown formatting such as asterisks (*), bold (**text**), italic (*text*), bullet points, or numbered lists
- Write in a natural, conversational tone as if you are a real person texting or messaging
- Keep responses friendly, helpful, and human-like
- Use plain text only - no special formatting characters
- Break up long responses into shorter, digestible paragraphs when needed`;
    
    // Add date/time context at the end
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    systemPrompt += `\n\n--- SYSTEM CONTEXT (do not mention this to users) ---
Current date: ${easternTime.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
Current time: ${easternTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
Day of the week: ${easternTime.toLocaleDateString("en-US", { weekday: "long" })}`;
    if (chatbot.website_content) {
      systemPrompt += `\n\nAdditional context from the company website:\n${chatbot.website_content}`;
    }

    // Add available actions to the system prompt
    if (chatbot.actions && chatbot.actions.length > 0) {
      console.log('Adding actions to system prompt:', chatbot.actions.length, 'actions found');
      console.log('Actions:', JSON.stringify(chatbot.actions, null, 2));
      systemPrompt += '\n\nAVAILABLE ACTIONS:\n';
      systemPrompt += 'CRITICAL: You MUST use these tools when the conversation context requires them. Do not ask for permission - execute the action immediately when appropriate.\n\n';
      systemPrompt += 'RESPONSE FORMAT RULE: When calling an action:\n';
      systemPrompt += '1. Keep your message to the user brief, natural, and conversational - DO NOT list or summarize the collected parameters\n';
      systemPrompt += '2. Add the JSON action call on a separate line: {"action": "action_name", "parameters": {...}}\n';
      systemPrompt += '3. Example good response: "Perfect, I have everything I need. I\'ll submit this now."\n';
      systemPrompt += '4. Example BAD response: "Let me summarize: Name: John, Email: john@example.com..." (NEVER do this)\n';
      systemPrompt += 'The action call will be processed automatically and invisibly to the user - they will only see your brief acknowledgment.\n\n';
      systemPrompt += 'MANDATORY RULE: If any trigger conditions are met, you MUST include the JSON action call on a separate line. This is non-negotiable for production.\n\n';
      
      for (const action of chatbot.actions) {
        systemPrompt += `ACTION: ${action.name}\n`;
        systemPrompt += `Description: ${action.description || 'Execute this action when relevant to the conversation'}\n`;
        systemPrompt += `Type: ${action.action_type}\n`;
        systemPrompt += `TRIGGER: Use this action immediately when the description criteria are met\n`;
        
        // Add parameter descriptions with examples based on action type
        switch (action.action_type) {
          case 'calendar_booking':
            systemPrompt += 'Required Parameters: {date: "YYYY-MM-DD", time: "HH:MM", attendeeName: "Name"}\n';
            systemPrompt += 'Optional Parameters: {duration: 30, attendeeEmail: "email@example.com", description: "Meeting details"}\n';
            systemPrompt += 'Example: {"action": "' + action.name + '", "parameters": {"date": "2024-03-15", "time": "14:30", "attendeeName": "John Doe", "attendeeEmail": "john@example.com", "duration": 60, "description": "Product demo meeting"}}\n';
            break;
          case 'email_send':
            systemPrompt += 'Required Parameters: {to: "recipient@email.com", subject: "Email subject", body: "Email content"}\n';
            systemPrompt += 'Optional Parameters: {fromName: "Sender Name"}\n';
            systemPrompt += 'Example: {"action": "' + action.name + '", "parameters": {"to": "customer@example.com", "subject": "Welcome to our service", "body": "Thank you for signing up!", "fromName": "Support Team"}}\n';
            break;
          case 'webhook_call':
            systemPrompt += 'Parameters: {data: {...}} (any JSON object with the data to send)\n';
            systemPrompt += 'Example: {"action": "' + action.name + '", "parameters": {"data": {"customerName": "John Doe", "action": "signup", "email": "john@example.com"}}}\n';
            break;
          case 'custom_tool':
            const config = action.configuration || {};
            const parameters = config.parameters || [];
            
            if (parameters.length > 0) {
              const requiredParams = parameters.filter(p => p.required);
              const optionalParams = parameters.filter(p => !p.required);
              
              if (requiredParams.length > 0) {
                systemPrompt += 'Required Parameters: {';
                systemPrompt += requiredParams.map(p => `${p.name}: "${p.description || p.name}"`).join(', ');
                systemPrompt += '}\n';
              }
              
              if (optionalParams.length > 0) {
                systemPrompt += 'Optional Parameters: {';
                systemPrompt += optionalParams.map(p => `${p.name}: "${p.description || p.name}"`).join(', ');
                systemPrompt += '}\n';
              }
              
              // Generate example with parameter names
              const exampleParams: any = {};
              parameters.forEach(p => {
                exampleParams[p.name] = p.type === 'email' ? 'example@email.com' : 
                                       p.type === 'number' ? '123' : 
                                       p.type === 'date' ? '2024-03-15' :
                                       `example ${p.name}`;
              });
              
              systemPrompt += 'Example: {"action": "' + action.name + '", "parameters": ' + JSON.stringify(exampleParams) + '}\n';
            } else {
              systemPrompt += 'Parameters: {} (no specific parameters required)\n';
              systemPrompt += 'Example: {"action": "' + action.name + '", "parameters": {}}\n';
            }
            break;
        }
        systemPrompt += '\n';
      }
      
      console.log('Final system prompt with actions:');
      console.log(systemPrompt);
    } else {
      console.log('No actions found for chatbot:', chatbotId);
    }
    
      if (chatbot.actions && chatbot.actions.length > 0) {
        systemPrompt += '\n\n=== CRITICAL: ACTION EXECUTION PROTOCOL ===\n';
        systemPrompt += 'When user confirms to proceed (says "yes", "correct", "okay", "confirm", "that\'s right", etc.):\n\n';
        systemPrompt += 'STEP 1: Output your confirmation message to the user\n';
        systemPrompt += 'STEP 2: On the VERY NEXT LINE output ONLY the action JSON with NO other text\n\n';
        systemPrompt += 'EXACT FORMAT REQUIRED:\n';
        systemPrompt += '{"action": "action_name", "parameters": {all_required_params}}\n\n';
        systemPrompt += 'EXAMPLE for booking tool:\n';
        systemPrompt += 'User confirms → You say: "All set—I\'ve submitted your request..."\n';
        systemPrompt += 'THEN IMMEDIATELY OUTPUT ON NEW LINE:\n';
        systemPrompt += '{"action": "booking", "parameters": {"full_name": "John Doe", "phone_number": "3055551234", "email": "john@example.com", "service": "Full Bag", "dexterity": "Right", "handicap": "22", " goals": "better fit", "shaft_preferance": "Graphite", "date_time": "10/19/2025 Morning"}}\n\n';
        systemPrompt += '⚠️ CRITICAL: The JSON line MUST be separate from your message. Do NOT skip this step or the action will not execute!\n';
        systemPrompt += '⚠️ CRITICAL: ALWAYS output the JSON when user confirms, even if you already confirmed to them!\n\n';
      }

    // Prepare messages for OpenAI
    console.log('Conversation history length:', conversationHistory.length);
    console.log('Current messages length:', messages.length);
    console.log('Conversation history:', JSON.stringify(conversationHistory, null, 2));
    console.log('Current messages:', JSON.stringify(messages, null, 2));
    
    const openaiMessages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Include conversation history first
      ...conversationHistory,
      // Then add the current messages
      ...messages
    ];
    
    console.log('Final OpenAI messages:', JSON.stringify(openaiMessages, null, 2));

    // Estimate input tokens
    const inputTokens = estimateTokens(JSON.stringify(openaiMessages));
    
    console.log('Sending to OpenAI with model:', chatbot.model, 'Input tokens:', inputTokens);

    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chatbot.model,
        messages: openaiMessages,
        temperature: parseFloat(chatbot.temperature) || 0.7,
        max_tokens: Math.min(chatbot.max_tokens || 1000, 4000), // Cap at 4000 tokens
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;
    
    // Calculate actual tokens used
    const outputTokens = estimateTokens(aiResponse);
    const totalCost = calculateCost(chatbot.model, inputTokens, outputTokens);

    console.log('Got AI response:', aiResponse.substring(0, 100) + '...', 'Output tokens:', outputTokens, 'Cost:', totalCost.toFixed(6));

    // PRODUCTION BULLETPROOF: Check if the AI response contains an action call
    let actionResult = null;
    
    // Multiple detection patterns to catch all possible action formats
    const hasActionKeyword = aiResponse.toLowerCase().includes('action');
    const hasJsonBraces = aiResponse.includes('{') && aiResponse.includes('}');
    const hasActionProperty = aiResponse.includes('"action"') || aiResponse.includes("'action'");
    const hasParameters = aiResponse.includes('parameters') || aiResponse.includes('name') || aiResponse.includes('phone');
    
    console.log('Action detection:', { hasActionKeyword, hasJsonBraces, hasActionProperty, hasParameters });
    
    // PRODUCTION FAILSAFE: Force tool execution based on conversation content
    let forcedAction = null;
    if (chatbot.actions && chatbot.actions.length > 0) {
      // Check for the booking tool (Prestige Golf)
      const bookingTool = chatbot.actions.find(a => a.name === 'booking');
      if (bookingTool) {
        const conversationText = messages.map(m => m.content).join(' ').toLowerCase();
        const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
        
        // Check if user confirmed (said yes, okay, correct, confirm, etc.)
        const confirmWords = ['yes', 'correct', 'okay', 'confirm', 'that\'s right', 'looks good', 'perfect'];
        const userConfirmed = confirmWords.some(word => lastUserMessage.includes(word));
        
        // Check if we have booking data in conversation history
        const hasName = /name.*?[A-Z][a-z]+\s+[A-Z][a-z]+/i.test(conversationText);
        const hasPhone = /\d{10}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(conversationText);
        const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(conversationText);
        
        console.log('Booking tool check:', { userConfirmed, hasName, hasPhone, hasEmail });
        
        // If user confirmed and we have enough info, force the action
        if (userConfirmed && hasName && (hasPhone || hasEmail) && !preview) {
          console.log('🎯 FORCING BOOKING TOOL EXECUTION - User confirmed with sufficient data');
          
          try {
            // Extract parameters from the conversation
            const extractResponse = await supabase.functions.invoke('extract-parameters', {
              body: {
                conversationId: conversationId,
                messages: messages
              }
            });
            
            console.log('Parameter extraction response:', extractResponse);
            
            // Get extracted parameters from database
            const { data: extractedParams } = await supabase
              .from('conversation_parameters')
              .select('parameter_name, parameter_value')
              .eq('conversation_id', conversationId);
            
            console.log('Extracted parameters from DB:', extractedParams);
            
            // Build parameters object from extracted data
            let parameters = {};
            if (extractedParams && extractedParams.length > 0) {
              for (const param of extractedParams) {
                parameters[param.parameter_name] = param.parameter_value;
              }
            }
            
            console.log('Booking parameters built:', JSON.stringify(parameters, null, 2));
            
            if (Object.keys(parameters).length > 0) {
              forcedAction = {
                action: bookingTool,
                parameters: parameters
              };
              console.log('✅ FORCING BOOKING TOOL EXECUTION with params:', forcedAction);
            }
          } catch (error) {
            console.error('Error extracting booking parameters:', error);
          }
        }
      }
      
      // Check for the make_eoc_tool specifically
      const eocTool = chatbot.actions.find(a => a.name === 'make_eoc_tool');
      if (eocTool) {
        // Get the conversation history to analyze
        const conversationText = messages.map(m => m.content).join(' ').toLowerCase();
        const currentMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
        
        // Check if conversation contains health conditions AND user provides name/phone
        const hasConditions = /\b(dermatitis|psoriasis|copd|asthma|urticaria)\b/i.test(conversationText);
        const hasName = /\bname\b/i.test(conversationText) && /\b[a-z]{2,}\s+[a-z]{2,}\b/i.test(conversationText);
        const hasPhone = /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4})\b/.test(conversationText);
        
         console.log('🔍 DEBUGGING WEBHOOK ISSUE:');
         console.log('EOC Tool check:', { hasConditions, hasName, hasPhone });
         console.log('Conversation text for analysis:', conversationText);
         console.log('Current message:', currentMessage);
         console.log('Preview flag:', preview);
         console.log('ConversationId exists:', !!conversationId);
         console.log('EOC Tool found:', !!eocTool);
         console.log('Actions available:', chatbot.actions?.map(a => a.name) || []);
         
         // Enhanced regex testing
         console.log('🔍 REGEX TESTING:');
         console.log('Conditions regex test:', /\b(dermatitis|psoriasis|copd|asthma|urticaria)\b/i.test(conversationText));
         console.log('Name regex test - has "name":', /\bname\b/i.test(conversationText));
         console.log('Name regex test - has full name pattern:', /\b[a-z]{2,}\s+[a-z]{2,}\b/i.test(conversationText));
         console.log('Phone regex test:', /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4})\b/.test(conversationText));
         
         // Also check for alternative patterns
         const hasPhoneAlt = /\d{10}|\d{3}.\d{3}.\d{4}/.test(conversationText);
         const hasNameAlt = /my name is|i'm|i am|call me/i.test(conversationText);
         console.log('🔍 ALTERNATIVE PATTERNS:');
         console.log('Alt phone pattern:', hasPhoneAlt);
         console.log('Alt name pattern:', hasNameAlt);
         
          // If they have conditions and provided contact info, force the action
          if (hasConditions && (hasName || hasPhone || hasNameAlt || hasPhoneAlt)) {
            console.log('🔍 CONDITIONS MET - About to execute forced action');
            console.log('🔍 hasConditions:', hasConditions);
            console.log('🔍 hasName:', hasName);
            console.log('🔍 hasPhone:', hasPhone);
            console.log('🔍 hasNameAlt:', hasNameAlt);
            console.log('🔍 hasPhoneAlt:', hasPhoneAlt);
           // Extract parameters properly using the extract-parameters function
           if (!preview) {
             console.log('NOT PREVIEW - Proceeding with parameter extraction');
            try {
              const extractResponse = await supabase.functions.invoke('extract-parameters', {
                body: {
                  conversationId: conversationId,
                  messages: messages
                }
              });
              
              console.log('Parameter extraction response:', extractResponse);
              
              // Get extracted parameters from database
              const { data: extractedParams } = await supabase
                .from('conversation_parameters')
                .select('parameter_name, parameter_value')
                .eq('conversation_id', conversationId);
              
              console.log('Extracted parameters from DB:', extractedParams);
              
              // Build parameters object from extracted data
              let parameters = {};
              if (extractedParams && extractedParams.length > 0) {
                for (const param of extractedParams) {
                  parameters[param.parameter_name] = param.parameter_value;
                }
              }
              
              console.log('Parameters object built:', JSON.stringify(parameters, null, 2));
              
               // Fallback to basic extraction if no proper parameters found
               if (Object.keys(parameters).length === 0) {
                 const nameMatch = conversationText.match(/(?:name|i'm|i am|my name is|this is)\s+([a-z]{2,}\s+[a-z]{2,})/i);
                 const phoneMatch = conversationText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/);
                 
                 parameters = {
                   name: nameMatch ? nameMatch[1] : 'Contact provided',
                   phone_number: phoneMatch ? phoneMatch[1] : 'Name provided'
                 };
               }
               
               // Auto-determine qualified status if missing
               if (!parameters.qualified) {
                 const qualifyingConditions = ['urticaria', 'atopic dermatitis', 'psoriasis', 'copd', 'asthma'];
                 const hasQualifyingCondition = qualifyingConditions.some(condition => conversationText.includes(condition.toLowerCase()));
                 parameters.qualified = hasQualifyingCondition ? 'qualified' : 'not qualified';
                 console.log('Auto-determined qualified status in forced action params:', parameters.qualified);
               }
               
               // Set condition if missing
               if (!parameters.condition) {
                 const conditions = conversationText.match(/(urticaria|atopic dermatitis|psoriasis|copd|asthma|arthritis|allergies)/i);
                 parameters.condition = conditions ? conditions[1] : 'other condition mentioned';
               }
              
              forcedAction = {
                action: eocTool,
                parameters: parameters
              };
              console.log('FORCING EOC TOOL EXECUTION with extracted params:', forcedAction);
              
            } catch (error) {
              console.error('Error extracting parameters:', error);
              // Fallback to basic regex extraction
              const nameMatch = conversationText.match(/(?:name|i'm|i am|my name is|this is)\s+([a-z]{2,}\s+[a-z]{2,})/i);
              const phoneMatch = conversationText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/);
              
               if (nameMatch || phoneMatch) {
                 const qualifyingConditions = ['urticaria', 'atopic dermatitis', 'psoriasis', 'copd', 'asthma'];
                 const hasQualifyingCondition = qualifyingConditions.some(condition => conversationText.includes(condition.toLowerCase()));
                 const conditions = conversationText.match(/(urticaria|atopic dermatitis|psoriasis|copd|asthma|arthritis|allergies)/i);
                 
                 forcedAction = {
                   action: eocTool,
                   parameters: {
                     name: nameMatch ? nameMatch[1] : 'Contact provided',
                     phone_number: phoneMatch ? phoneMatch[1] : 'Name provided',
                     condition: conditions ? conditions[1] : 'other condition mentioned',
                     qualified: hasQualifyingCondition ? 'qualified' : 'not qualified'
                   }
                 };
                 console.log('FORCING EOC TOOL EXECUTION (fallback with all params):', forcedAction);
               }
            }
          }
        }
      }
    }
    
    if (hasJsonBraces && (hasActionProperty || (hasActionKeyword && hasParameters))) {
      try {
        // Extract JSON from the response using multiple robust approaches
        let jsonMatch = null;
        
        // Multiple extraction approaches for bulletproof parsing
        
        // Method 1: Look for "action" property
        let actionIndex = aiResponse.indexOf('"action":');
        if (actionIndex === -1) actionIndex = aiResponse.indexOf("'action':");
        
        if (actionIndex !== -1) {
          // Find the opening brace before "action"
          let startIndex = actionIndex;
          while (startIndex > 0 && aiResponse[startIndex] !== '{') {
            startIndex--;
          }
          
          if (aiResponse[startIndex] === '{') {
            // Count braces to find the matching closing brace
            let braceCount = 1;
            let endIndex = startIndex + 1;
            
            while (endIndex < aiResponse.length && braceCount > 0) {
              if (aiResponse[endIndex] === '{') {
                braceCount++;
              } else if (aiResponse[endIndex] === '}') {
                braceCount--;
              }
              endIndex++;
            }
            
            if (braceCount === 0) {
              const jsonString = aiResponse.substring(startIndex, endIndex);
              jsonMatch = [jsonString];
            }
          }
        }
        
        // Method 2: If no action property found, look for any JSON with action names
        if (!jsonMatch) {
          const actionNames = chatbot.actions?.map(a => a.name) || [];
          for (const actionName of actionNames) {
            const nameIndex = aiResponse.indexOf(`"${actionName}"`);
            if (nameIndex !== -1) {
              // Find nearest opening brace
              let startIndex = nameIndex;
              while (startIndex > 0 && aiResponse[startIndex] !== '{') {
                startIndex--;
              }
              
              if (aiResponse[startIndex] === '{') {
                let braceCount = 1;
                let endIndex = startIndex + 1;
                
                while (endIndex < aiResponse.length && braceCount > 0) {
                  if (aiResponse[endIndex] === '{') braceCount++;
                  else if (aiResponse[endIndex] === '}') braceCount--;
                  endIndex++;
                }
                
                if (braceCount === 0) {
                  const jsonString = aiResponse.substring(startIndex, endIndex);
                  jsonMatch = [jsonString];
                  break;
                }
              }
            }
          }
        }
        
        // Method 3: Fallback - extract any complete JSON object
        if (!jsonMatch) {
          const braceStart = aiResponse.indexOf('{');
          if (braceStart !== -1) {
            let braceCount = 1;
            let endIndex = braceStart + 1;
            
            while (endIndex < aiResponse.length && braceCount > 0) {
              if (aiResponse[endIndex] === '{') braceCount++;
              else if (aiResponse[endIndex] === '}') braceCount--;
              endIndex++;
            }
            
            if (braceCount === 0) {
              const jsonString = aiResponse.substring(braceStart, endIndex);
              // Only use if it contains action-related keywords
              if (jsonString.includes('action') || jsonString.includes('name') || jsonString.includes('phone')) {
                jsonMatch = [jsonString];
              }
            }
          }
        }
        
        if (jsonMatch) {
          const actionCall = JSON.parse(jsonMatch[0]);
          
          // Find the action by name
          const action = chatbot.actions?.find(a => a.name === actionCall.action);
          if (action) {
            console.log('Executing action:', action.name);
            
            // Ensure all required parameters are present
            let actionParameters = actionCall.parameters || {};
            
            // For custom tools, auto-fill missing required parameters
            if (action.action_type === 'custom_tool' && action.configuration?.parameters) {
              for (const param of action.configuration.parameters) {
                if (param.required && !actionParameters[param.name]) {
                  if (param.name === 'qualified') {
                    // Auto-determine qualified status based on conversation
                    const allText = [...conversationHistory, ...messages].map(m => m.content).join(' ').toLowerCase();
                    const qualifyingConditions = ['urticaria', 'atopic dermatitis', 'psoriasis', 'copd', 'asthma'];
                    const hasQualifyingCondition = qualifyingConditions.some(condition => allText.includes(condition.toLowerCase()));
                    actionParameters.qualified = hasQualifyingCondition ? 'qualified' : 'not qualified';
                    console.log('Auto-determined qualified status:', actionParameters.qualified);
                  }
                }
              }
            }
            
            // Map parameters for make_eoc_tool to match webhook expectations
            let mappedActionParameters = { ...actionParameters };
            if (action.name === 'make_eoc_tool' && actionParameters.name) {
              const nameParts = actionParameters.name.trim().split(/\s+/);
              mappedActionParameters.first_name = nameParts[0] || '';
              mappedActionParameters.last_name = nameParts.slice(1).join(' ') || nameParts[0] || '';
              delete mappedActionParameters.name;
              console.log('Mapped name parameters:', { 
                original: actionParameters.name, 
                first_name: mappedActionParameters.first_name, 
                last_name: mappedActionParameters.last_name 
              });
            }
            
            // Call the action execution function without awaiting to avoid blocking
            supabase.functions.invoke('execute-action', {
              body: {
                actionId: action.id,
                inputData: mappedActionParameters,
                conversationId: conversationId,
              }
            }).then(actionResponse => {
              if (!actionResponse.error) {
                console.log('Action executed successfully');
              } else {
                console.error('Action execution failed:', actionResponse.error);
              }
            }).catch(actionError => {
              console.error('Action execution error:', actionError);
            });
            
            // Set actionResult to prevent duplicate execution
            actionResult = { success: true, message: 'Action triggered' };
                
                // Call extract-parameters after custom tool execution to extract conversation data
                if (action.action_type === 'custom_tool' && conversationId) {
                  const allMessages = [...conversationHistory, ...messages, { role: 'assistant', content: aiResponse }];
                  supabase.functions.invoke('extract-parameters', {
                    body: {
                      conversationId: conversationId,
                      messages: allMessages
                    }
                  }).then(extractResponse => {
                    if (!extractResponse.error) {
                      console.log('Parameters extracted successfully after custom tool execution');
                    } else {
                      console.error('Parameter extraction failed:', extractResponse.error);
                    }
                  }).catch(extractError => {
                    console.error('Error extracting parameters:', extractError);
                  });
                }
            
            // Remove the action call from the response (make it invisible to user)
            // Handle various formats: JSON on same line, new line, with/without whitespace
            aiResponse = aiResponse.replace(jsonMatch[0], '').trim();
            
            // Also remove common separators that might be left behind
            aiResponse = aiResponse.replace(/[\n\r]+$/, '').trim();
            aiResponse = aiResponse.replace(/[.,;:]\s*$/, '').trim();
            
            // If removing the action left an empty response, provide action-specific acknowledgment
            if (aiResponse.length === 0 || aiResponse.length < 3) {
              if (actionCall.action_type === 'calendar_booking') {
                aiResponse = "All set—I've submitted your request. Our team will reach out during business hours to confirm the exact time. If you need anything sooner, you can call (305) 452-0699 or email info@prestige-golf.com";
              } else {
                aiResponse = "Got it! I've processed that for you.";
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing action call:', error);
        // Don't modify the response if we can't parse the action
      }
    }
    
    // Execute forced action if no action was detected but conditions are met
    if (!actionResult && forcedAction && !preview) {
      try {
        console.log('Executing forced action:', forcedAction.action.name);
        
        // Ensure all required parameters are present for forced action
        let forcedActionParameters = forcedAction.parameters || {};
        
        // For custom tools, auto-fill missing required parameters
        if (forcedAction.action.action_type === 'custom_tool' && forcedAction.action.configuration?.parameters) {
          for (const param of forcedAction.action.configuration.parameters) {
            if (param.required && !forcedActionParameters[param.name]) {
              if (param.name === 'qualified') {
                // Auto-determine qualified status based on conversation
                const allText = [...conversationHistory, ...messages].map(m => m.content).join(' ').toLowerCase();
                const qualifyingConditions = ['urticaria', 'atopic dermatitis', 'psoriasis', 'copd', 'asthma'];
                const hasQualifyingCondition = qualifyingConditions.some(condition => allText.includes(condition.toLowerCase()));
                forcedActionParameters.qualified = hasQualifyingCondition ? 'qualified' : 'not qualified';
                console.log('Auto-determined qualified status for forced action:', forcedActionParameters.qualified);
              }
            }
          }
        }
        
        // Map parameters for make_eoc_tool to match webhook expectations  
        let mappedForcedActionParameters = { ...forcedActionParameters };
        if (forcedAction.action.name === 'make_eoc_tool' && forcedActionParameters.name) {
          const nameParts = forcedActionParameters.name.trim().split(/\s+/);
          mappedForcedActionParameters.first_name = nameParts[0] || '';
          mappedForcedActionParameters.last_name = nameParts.slice(1).join(' ') || nameParts[0] || '';
          delete mappedForcedActionParameters.name;
          console.log('Mapped forced action name parameters:', { 
            original: forcedActionParameters.name, 
            first_name: mappedForcedActionParameters.first_name, 
            last_name: mappedForcedActionParameters.last_name 
          });
        }
        
        // Call the forced action execution function without awaiting to avoid blocking
        supabase.functions.invoke('execute-action', {
          body: {
            actionId: forcedAction.action.id,
            inputData: mappedForcedActionParameters,
            conversationId: conversationId,
          }
        }).then(actionResponse => {
          if (!actionResponse.error) {
            console.log('Forced action executed successfully');
            
            // Call extract-parameters after custom tool execution to extract conversation data
            if (forcedAction.action.action_type === 'custom_tool' && conversationId) {
              const allMessages = [...conversationHistory, ...messages, { role: 'assistant', content: aiResponse }];
              supabase.functions.invoke('extract-parameters', {
                body: {
                  conversationId: conversationId,
                  messages: allMessages
                }
              }).then(extractResponse => {
                if (!extractResponse.error) {
                  console.log('Parameters extracted successfully after forced custom tool execution');
                } else {
                  console.error('Parameter extraction failed:', extractResponse.error);
                }
              }).catch(extractError => {
                console.error('Error extracting parameters:', extractError);
              });
            }
          } else {
            console.error('Forced action execution failed:', actionResponse.error);
          }
        }).catch(actionError => {
          console.error('Forced action execution error:', actionError);
        });
        
        console.log('Forced action queued, preventing duplicates');
        
      } catch (error) {
        console.error('Error executing forced action:', error);
      }
    }

    // Save AI response and cache it (skip for preview)
    // Only save if there's actual content (don't save empty messages from action-only responses)
    if (!preview && conversationId && aiResponse.trim().length > 0) {
      await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse
        }]);

      // Cache the response if caching is enabled (only cache non-empty responses)
      if (chatbot.cache_enabled && messages.length > 0 && aiResponse.trim().length > 0) {
        const userMessage = messages[messages.length - 1];
        if (userMessage && userMessage.role === 'user') {
          const questionHash = createQuestionHash(userMessage.content);
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + (chatbot.cache_duration_hours || 168));

          await supabase
            .from('response_cache')
            .insert({
              chatbot_id: chatbotId,
              question_hash: questionHash,
              question_text: userMessage.content,
              response_text: aiResponse,
              model_used: chatbot.model,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              expires_at: expiresAt.toISOString(),
            });
        }
      }

      // Log token usage
      await supabase
        .from('token_usage')
        .insert({
          chatbot_id: chatbotId,
          conversation_id: conversationId,
          model_used: chatbot.model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_cost: totalCost,
          cache_hit: false,
        });
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        conversationId,
        actionResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('CRITICAL ERROR in chat function:', error);
    console.error('Error stack:', error.stack);
    
    // Send error notification if we have the chatbot owner info
    if (chatbotOwnerUserId && conversationId) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: chatbotOwnerUserId,
            type: 'chat_error',
            chatbotName: chatbot?.name || 'Unknown Chatbot',
            conversationId: conversationId,
            errorMessage: error.message
          }
        });
      } catch (notificationError) {
        console.error('Failed to send error notification:', notificationError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});