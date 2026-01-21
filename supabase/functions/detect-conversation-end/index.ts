import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to evaluate email conditions with new group structure
const evaluateConditions = (conditions: any, data: any): boolean => {
  console.log('Evaluating conditions:', JSON.stringify(conditions, null, 2));
  
  if (!conditions) {
    return true; // Send email if no conditions specified
  }

  // Handle legacy format
  if (conditions.rules && !conditions.groups) {
    console.log('Using legacy condition format');
    const logic = conditions.logic || 'AND';
    const results = conditions.rules.map((rule: any) => evaluateRule(rule, data));
    return logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  // Handle new group format
  if (!conditions.groups || conditions.groups.length === 0) {
    return true;
  }

  console.log('Using new group-based condition format');
  const mainLogic = conditions.logic || 'AND';
  const groupResults = conditions.groups.map((group: any, groupIndex: number) => {
    console.log(`Evaluating group ${groupIndex + 1} with ${group.rules.length} rules`);
    const groupLogic = group.logic || 'AND';
    const ruleResults = group.rules.map((rule: any, ruleIndex: number) => {
      const result = evaluateRule(rule, data);
      console.log(`Group ${groupIndex + 1}, Rule ${ruleIndex + 1}: ${result}`);
      return result;
    });
    const groupResult = groupLogic === 'AND' ? ruleResults.every(Boolean) : ruleResults.some(Boolean);
    console.log(`Group ${groupIndex + 1} result: ${groupResult}`);
    return groupResult;
  });

  const finalResult = mainLogic === 'AND' ? groupResults.every(Boolean) : groupResults.some(Boolean);
  console.log(`Final condition result: ${finalResult}`);
  return finalResult;
};

// Helper function to evaluate individual rules
const evaluateRule = (rule: any, data: any): boolean => {
  const { type, field, operator, value, case_sensitive, sender, parameter_name } = rule;
  
  console.log(`Evaluating rule:`, { type, field, operator, value, case_sensitive, sender });
  
  // Handle basic conditions
  if (type === 'basic' || field === 'always') {
    return value === 'true';
  }
  
  // Handle message content matching
  if (type === 'message_content') {
    return evaluateMessageContent(field, operator, value, case_sensitive, data);
  }
  
  // Handle custom parameters
  if (type === 'custom_parameter') {
    return evaluateCustomParameter(field, operator, value, data);
  }
  
  // Handle parameter existence checks
  if (type === 'parameter_exists') {
    return evaluateParameterExists(parameter_name, operator, data);
  }
  
  // Legacy support - direct field evaluation
  const fieldValue = data[field];
  return evaluateValue(fieldValue, operator, value, false);
};

// Helper function to evaluate message content conditions
const evaluateMessageContent = (field: string, operator: string, value: string, case_sensitive: boolean, data: any): boolean => {
  const messages = data.messages || [];
  const searchValue = case_sensitive ? value : value.toLowerCase();
  
  let messagesToCheck: any[] = [];
  
  switch (field) {
    case 'user_message':
      messagesToCheck = messages.filter((msg: any) => msg.role === 'user');
      break;
    case 'bot_message':
      messagesToCheck = messages.filter((msg: any) => msg.role === 'assistant');
      break;
    case 'any_message':
    default:
      messagesToCheck = messages;
      break;
  }
  
  console.log(`Checking ${messagesToCheck.length} messages for pattern: "${searchValue}"`);
  
  return messagesToCheck.some((message: any) => {
    const content = case_sensitive ? message.content : message.content?.toLowerCase() || '';
    return evaluateValue(content, operator, searchValue, case_sensitive);
  });
};

// Helper function to evaluate custom parameter conditions
const evaluateCustomParameter = (field: string, operator: string, value: string, data: any): boolean => {
  let fieldValue: any;
  
  switch (field) {
    case 'conversation_length':
      fieldValue = data.message_count || (data.messages?.length || 0);
      break;
    case 'conversation_duration':
      fieldValue = data.duration_minutes || 0;
      break;
    case 'user_rating':
      fieldValue = data.user_rating || 0;
      break;
    case 'summary_sentiment':
      fieldValue = data.summary_sentiment || '';
      break;
    case 'agent_name':
      fieldValue = data.bot_name || '';
      break;
    default:
      // Check if it's a tool parameter (prefixed with 'tool_')
      if (field.startsWith('tool_')) {
        fieldValue = data.tool_parameters?.[field] || data[field];
      } else {
        // Check if it's a custom parameter from conversation_parameters
        fieldValue = data.custom_parameters?.[field] || data[field];
      }
  }
  
  console.log(`Custom parameter ${field}: ${fieldValue} ${operator} ${value}`);
  return evaluateValue(fieldValue, operator, value, false);
};

// Helper function to evaluate parameter existence
const evaluateParameterExists = (parameter_name: string, operator: string, data: any): boolean => {
  let exists = false;
  
  if (parameter_name.startsWith('tool_')) {
    // Check tool parameters
    exists = data.tool_parameters && data.tool_parameters[parameter_name] !== undefined;
  } else {
    // Check custom parameters
    exists = data.custom_parameters && data.custom_parameters[parameter_name] !== undefined;
  }
  
  console.log(`Parameter existence check ${parameter_name}: ${exists} (operator: ${operator})`);
  
  return operator === 'exists' ? exists : !exists;
};

// Helper function to evaluate value comparisons
const evaluateValue = (fieldValue: any, operator: string, value: string, case_sensitive: boolean): boolean => {
  const compareField = case_sensitive ? String(fieldValue) : String(fieldValue).toLowerCase();
  const compareValue = case_sensitive ? String(value) : String(value).toLowerCase();
  
  switch (operator) {
    case 'equals':
      return compareField === compareValue;
    case 'contains':
      return compareField.includes(compareValue);
    case 'starts_with':
      return compareField.startsWith(compareValue);
    case 'ends_with':
      return compareField.endsWith(compareValue);
    case 'not_contains':
      return !compareField.includes(compareValue);
    case 'not_equals':
      return compareField !== compareValue;
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'greater_than_equal':
      return Number(fieldValue) >= Number(value);
    case 'less_than_equal':
      return Number(fieldValue) <= Number(value);
    default:
      return false;
  }
};

// Helper function to render email template
const renderEmailTemplate = (template: string, data: any): string => {
  if (!template) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Chat Session Ended</h2>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #3b82f6; margin: 0 0 10px 0;">Session Details</h3>
          <p><strong>Chatbot:</strong> ${data.bot_name}</p>
          <p><strong>End Date & Time:</strong> ${data.timestamp}</p>
          <p><strong>Session Duration:</strong> ${data.timeout_minutes} minutes of inactivity reached</p>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #475569; margin: 0 0 10px 0;">Conversation Summary</h3>
          <p style="white-space: pre-line; line-height: 1.5;">${data.conversation_summary}</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          This is an automated notification from your Voxtro chatbot system.
        </p>
      </div>
    `;
  }

  let rendered = template;
  
  // Replace template variables
  const variables = {
    user_name: data.user_name || 'Unknown User',
    bot_name: data.bot_name || 'Chatbot',
    conversation_summary: data.conversation_summary || 'No summary available',
    timestamp: data.timestamp || new Date().toISOString(),
    first_message: data.first_message || 'No first message',
    last_message: data.last_message || 'No last message',
    ...data.custom_parameters || {},
    ...data.tool_parameters || {}
  };

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, String(value));
  });

  return rendered;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('Starting conversation end detection...');

    // Check if this is a force end request from widget
    const bodyText = await req.text();
    let requestBody = null;
    try {
      requestBody = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // Ignore parsing errors for non-JSON requests
    }
    
    // Handle force end conversation request
    if (requestBody?.forceEnd && requestBody?.chatbotId && requestBody?.visitorId) {
      console.log(`Force ending conversation for visitor ${requestBody.visitorId}`);
      
      // Find and end the active conversation for this visitor
      const { data: activeConversation, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('chatbot_id', requestBody.chatbotId)
        .eq('visitor_id', requestBody.visitorId)
        .eq('status', 'active')
        .single();
        
      if (activeConversation) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', activeConversation.id);
          
        if (updateError) {
          console.error('Error force ending conversation:', updateError);
        } else {
          console.log(`Successfully force ended conversation ${activeConversation.id}`);
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Conversation force ended' }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get the current timestamp minus timeout intervals
    const now = new Date();
    
    // Query for conversations that should be considered "ended"
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        chatbot_id,
        created_at,
        status,
        visitor_id,
        chatbots!inner (
          id,
          name,
          user_id,
          session_timeout_minutes,
          end_chat_notification_enabled,
          end_chat_notification_email,
          email_template,
          email_conditions
        )
      `)
      .eq('status', 'active')
      .eq('chatbots.end_chat_notification_enabled', true)
      .not('chatbots.end_chat_notification_email', 'is', null);

    if (conversationsError) {
      throw conversationsError;
    }

    console.log(`Found ${conversations?.length || 0} conversations with notifications enabled`);

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No conversations with notifications enabled found',
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    let processedCount = 0;

    for (const conv of conversations) {
      const chatbot = conv.chatbots;
      const timeoutMinutes = chatbot.session_timeout_minutes || 30;
      
      // Calculate if this conversation has timed out
      const { data: lastMessage, error: messageError } = await supabase
        .from('messages')
        .select('created_at, role, content')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (messageError || !lastMessage) {
        console.log(`No messages found for conversation ${conv.id}, skipping`);
        continue;
      }

      const lastMessageTime = new Date(lastMessage.created_at);
      const timeoutThreshold = new Date(lastMessageTime.getTime() + (timeoutMinutes * 60 * 1000));
      
      if (now < timeoutThreshold) {
        // Conversation hasn't timed out yet
        continue;
      }

      console.log(`Processing timed out conversation ${conv.id} for chatbot ${chatbot.name}`);

      // Get all messages for this conversation for context
      const { data: allMessages, error: allMessagesError } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (allMessagesError) {
        console.error('Error fetching messages:', allMessagesError);
        continue;
      }

      // Extract parameters before evaluating conditions
      if (allMessages && allMessages.length > 0) {
        try {
          await supabase.functions.invoke('extract-parameters', {
            body: {
              conversationId: conv.id,
              messages: allMessages
            }
          });
        } catch (extractError) {
          console.error('Error extracting parameters:', extractError);
        }
      }

      // Get extracted custom parameters
      const { data: customParams, error: paramsError } = await supabase
        .from('conversation_parameters')
        .select('parameter_name, parameter_value')
        .eq('conversation_id', conv.id);

      const customParameters: Record<string, string> = {};
      if (customParams) {
        customParams.forEach(param => {
          customParameters[param.parameter_name] = param.parameter_value;
        });
      }

      // Get tool execution data for this conversation
      const { data: toolExecutions, error: toolError } = await supabase
        .from('action_execution_logs')
        .select(`
          input_data,
          output_data,
          chatbot_actions!inner (
            name,
            action_type,
            configuration
          )
        `)
        .eq('conversation_id', conv.id)
        .eq('status', 'success')
        .eq('chatbot_actions.action_type', 'custom_tool');

      const toolParameters: Record<string, any> = {};
      if (toolExecutions) {
        toolExecutions.forEach(execution => {
          const inputData = execution.input_data || {};
          Object.entries(inputData).forEach(([key, value]) => {
            toolParameters[`tool_${key}`] = value;
          });
        });
      }

      // Generate conversation summary
      const messageTexts = allMessages?.map(m => `${m.role}: ${m.content}`).join('\n') || '';
      const firstMessage = allMessages?.[0]?.content || '';
      const lastMessageContent = allMessages?.[allMessages.length - 1]?.content || '';

      // Create a simple summary (you could enhance this with AI)
      let summary = '';
      if (allMessages && allMessages.length > 0) {
        summary = `Conversation with ${allMessages.length} messages. `;
        summary += `Started: ${new Date(allMessages[0].created_at).toLocaleString()}. `;
        summary += `Ended: ${new Date(lastMessage.created_at).toLocaleString()}.`;
      } else {
        summary = 'No conversation content available.';
      }

      // Mark conversation as ended
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          status: 'ended',
          ended_at: now.toISOString()
        })
        .eq('id', conv.id);

      if (updateError) {
        console.error(`Error updating conversation ${conv.id}:`, updateError);
        continue;
      }

      // Check if we should send email based on conditions
      if (chatbot.end_chat_notification_email) {
        try {
          const conversation = {
            chatbot_name: chatbot.name,
            summary,
            first_message: firstMessage,
            last_message: lastMessageContent,
            timeout_minutes: timeoutMinutes,
            messages: allMessages || [],
            message_count: allMessages?.length || 0,
            notification_email: chatbot.end_chat_notification_email,
            last_activity: lastMessage.created_at
          };

          console.log('Checking email conditions...');
          
          // Prepare condition evaluation data with messages for content matching
          const conditionData = {
            bot_name: conversation.chatbot_name,
            conversation_summary: conversation.summary,
            first_message: conversation.first_message,
            last_message: conversation.last_message,
            timeout_minutes: conversation.timeout_minutes,
            messages: conversation.messages || [],
            message_count: conversation.messages?.length || 0,
            duration_minutes: conversation.timeout_minutes,
            user_rating: 0, // Could be extracted from conversation if available
            summary_sentiment: 'neutral', // Could be analyzed from summary
            custom_parameters: customParameters,
            tool_parameters: toolParameters
          };

          const shouldSendEmail = evaluateConditions(
            chatbot.email_conditions,
            conditionData
          );

          if (shouldSendEmail) {
            console.log(`Sending custom email notification to: ${conversation.notification_email}`);
            
            const chatEndDate = new Date(conversation.last_activity).toLocaleString();
            
            // Prepare template data
            const templateData = {
              user_name: 'Valued Customer',
              bot_name: conversation.chatbot_name,
              conversation_summary: conversation.summary,
              timestamp: chatEndDate,
              first_message: conversation.first_message,
              last_message: conversation.last_message,
              timeout_minutes: conversation.timeout_minutes,
              custom_parameters: customParameters,
              tool_parameters: toolParameters
            };

            // Render the custom email template
            const emailContent = renderEmailTemplate(chatbot.email_template, templateData);

            // Send email using the basic-email function
            const { error: emailError } = await supabase.functions.invoke('basic-email', {
              body: {
                email: conversation.notification_email,
                subject: `Chat session ended - ${conversation.chatbot_name}`,
                message: emailContent
              }
            });

            if (emailError) {
              console.error('Error sending email:', emailError);
            } else {
              console.log('Email sent successfully');
              processedCount++;
            }
          } else {
            console.log('Email conditions not met, skipping email notification');
          }
        } catch (emailCheckError: any) {
          console.error('Error in email condition checking:', emailCheckError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} conversations`,
        processed: processedCount,
        total_checked: conversations.length
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error in detect-conversation-end function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
};

serve(handler);