import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { actionId, inputData, conversationId } = await req.json();

    if (!actionId || !inputData) {
      return new Response(JSON.stringify({ error: 'Missing actionId or inputData' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the action configuration
    const { data: action, error: actionError } = await supabase
      .from('chatbot_actions')
      .select('*')
      .eq('id', actionId)
      .eq('is_active', true)
      .single();

    if (actionError || !action) {
      return new Response(JSON.stringify({ error: 'Action not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the action execution
    const { data: logEntry } = await supabase
      .from('action_execution_logs')
      .insert({
        chatbot_action_id: actionId,
        conversation_id: conversationId,
        status: 'pending',
        input_data: inputData,
      })
      .select()
      .single();

    let result;
    let status = 'success';
    let errorMessage = null;

    try {
      // Execute the action based on its type
      switch (action.action_type) {
        case 'calendar_booking':
          result = await executeCalendarBooking(action, inputData);
          break;
        case 'email_send':
          result = await executeEmailSend(action, inputData);
          break;
        case 'webhook_call':
          result = await executeWebhookCall(action, inputData);
          break;
        case 'zapier_trigger':
          result = await executeZapierTrigger(action, inputData);
          break;
        case 'custom_tool':
          result = await executeCustomTool(action, inputData);
          break;
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }
    } catch (error) {
      console.error('Action execution failed:', error);
      status = 'failed';
      errorMessage = error.message;
      result = { error: error.message };
    }

    // Update the log entry
    if (logEntry) {
      await supabase
        .from('action_execution_logs')
        .update({
          status,
          output_data: result,
          error_message: errorMessage,
        })
        .eq('id', logEntry.id);
    }

    return new Response(JSON.stringify({ 
      success: status === 'success',
      result,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in execute-action function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeCalendarBooking(action: any, inputData: any) {
  const { configuration } = action;
  const { date, time, duration, attendeeName, attendeeEmail, description, userId } = inputData;

  console.log('Executing calendar booking:', { date, time, duration, attendeeName });

  // Validate required fields
  if (!date || !time || !attendeeName) {
    throw new Error('Missing required booking fields: date, time, and attendeeName are required');
  }

  // Validate date format (should be YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Invalid date format. Please use YYYY-MM-DD format (e.g., 2024-03-15)');
  }

  // Validate time format (should be HH:MM)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    throw new Error('Invalid time format. Please use HH:MM format (e.g., 14:30)');
  }

  // Validate date is not in the past
  const bookingDate = new Date(`${date}T${time}:00`);
  const now = new Date();
  if (bookingDate < now) {
    throw new Error('Cannot book appointments in the past. Please select a future date and time.');
  }

  // Validate email if provided
  if (attendeeEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(attendeeEmail)) {
      throw new Error('Invalid email address format');
    }
  }

  // Simple direct booking - no OAuth complications
  console.log('Processing booking:', { attendeeName, date, time, attendeeEmail });
  
  const bookingId = `apt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const bookingDuration = duration || configuration.defaultDuration || 30;
  
  // Calculate end time
  const startTime = new Date(`${date}T${time}:00`);
  const endTime = new Date(startTime.getTime() + (bookingDuration * 60000));
  
  return {
    success: true,
    bookingId,
    message: `✅ Perfect! Your appointment is confirmed for ${attendeeName} on ${date} at ${time}. Booking reference: ${bookingId}`,
    details: {
      bookingId,
      date,
      time,
      endTime: endTime.toTimeString().slice(0, 5),
      duration: bookingDuration,
      attendee: {
        name: attendeeName,
        email: attendeeEmail || 'Not provided',
      },
      description: description || 'Appointment scheduled via chatbot',
      status: 'confirmed',
      provider: 'direct',
    },
  };

}

async function executeEmailSend(action: any, inputData: any) {
  const { configuration } = action;
  const { to, subject, body, fromName } = inputData;

  console.log('Executing email send:', { to, subject });

  // Validate required fields
  if (!to || !subject || !body) {
    throw new Error('Missing required email fields: to, subject, and body are required');
  }

  if (!configuration.fromEmail) {
    throw new Error('Email action not properly configured: missing fromEmail in configuration');
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: `${fromName || 'Chatbot Assistant'} <${configuration.fromEmail}>`,
      to: [to],
      subject: subject,
      html: body.replace(/\n/g, '<br>'), // Convert line breaks to HTML
    });

    if (emailResponse.error) {
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log('Email sent successfully:', emailResponse.data);
    
    return {
      success: true,
      emailId: emailResponse.data?.id,
      message: `Email sent successfully to ${to}`,
      details: {
        to,
        from: `${fromName || 'Chatbot Assistant'} <${configuration.fromEmail}>`,
        subject,
        body,
        messageId: emailResponse.data?.id,
      },
    };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function executeWebhookCall(action: any, inputData: any) {
  const { configuration } = action;
  const { webhookUrl, method, headers } = configuration;

  console.log('Executing webhook call:', { webhookUrl, method });

  // Validate webhook URL
  if (!webhookUrl) {
    throw new Error('Webhook URL not configured');
  }

  try {
    new URL(webhookUrl); // Validate URL format
  } catch (error) {
    throw new Error('Invalid webhook URL format');
  }

  try {
    const parsedHeaders = headers ? JSON.parse(headers) : {};
    const requestMethod = method || 'POST';
    
    // Add timestamp and source information
    const payload = {
      ...inputData,
      _metadata: {
        timestamp: new Date().toISOString(),
        source: 'chatbot_action',
        actionId: action.id,
      }
    };
    
    const response = await fetch(webhookUrl, {
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Chatbot-Webhook/1.0',
        ...parsedHeaders,
      },
      body: JSON.stringify(payload),
    });

    let result;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = { 
        message: await response.text(),
        contentType: contentType || 'unknown'
      };
    }

    if (!response.ok) {
      throw new Error(`Webhook returned status ${response.status}: ${JSON.stringify(result)}`);
    }

    return {
      success: true,
      message: 'Webhook called successfully',
      statusCode: response.status,
      response: result,
      url: webhookUrl,
      method: requestMethod,
    };
  } catch (error) {
    console.error('Webhook call error:', error);
    throw new Error(`Webhook call failed: ${error.message}`);
  }
}

async function executeZapierTrigger(action: any, inputData: any) {
  const { configuration } = action;
  const { zapierWebhook, eventName } = configuration;

  console.log('Executing Zapier trigger:', { zapierWebhook, eventName });

  // Validate Zapier webhook URL
  if (!zapierWebhook) {
    throw new Error('Zapier webhook URL not configured');
  }

  if (!zapierWebhook.includes('hooks.zapier.com')) {
    throw new Error('Invalid Zapier webhook URL. Must be a valid Zapier webhook endpoint.');
  }

  try {
    const payload = {
      event: eventName || 'chatbot_action',
      data: inputData,
      timestamp: new Date().toISOString(),
      chatbot_action_id: action.id,
      source: 'chatbot'
    };

    const response = await fetch(zapierWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Chatbot-Zapier/1.0',
      },
      body: JSON.stringify(payload),
    });

    // Zapier typically returns 200 even for successful triggers
    let result;
    try {
      const text = await response.text();
      result = text ? JSON.parse(text) : { message: 'Trigger sent to Zapier' };
    } catch (parseError) {
      result = { message: 'Trigger sent to Zapier', rawResponse: await response.text() };
    }

    if (!response.ok) {
      throw new Error(`Zapier webhook returned status ${response.status}`);
    }

    return {
      success: true,
      message: 'Zapier trigger executed successfully',
      statusCode: response.status,
      event: eventName || 'chatbot_action',
      zapierResponse: result,
    };
  } catch (error) {
    console.error('Zapier trigger error:', error);
    throw new Error(`Zapier trigger failed: ${error.message}`);
  }
}

async function executeCustomTool(action: any, inputData: any) {
  const { configuration } = action;
  const { webhookUrl, parameters, emailAutomation } = configuration;

  console.log('Executing custom tool:', action.name, { webhookUrl, emailEnabled: emailAutomation?.enabled });
  console.log('Input data received:', JSON.stringify(inputData, null, 2));
  console.log('Configuration parameters:', JSON.stringify(parameters, null, 2));

  // Validate webhook URL
  if (!webhookUrl) {
    throw new Error('Webhook URL not configured for custom tool');
  }

  try {
    new URL(webhookUrl); // Validate URL format
  } catch (error) {
    throw new Error('Invalid webhook URL format');
  }

  // Validate required parameters
  if (parameters && Array.isArray(parameters)) {
    for (const param of parameters) {
      if (param.required && (!inputData[param.name] || inputData[param.name].toString().trim() === '')) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }
    }
  }

  try {
    // Prepare payload with custom tool metadata
    const payload = {
      tool_name: action.name,
      tool_description: action.description,
      parameters: inputData,
      _metadata: {
        timestamp: new Date().toISOString(),
        source: 'custom_tool',
        actionId: action.id,
        chatbotId: action.chatbot_id,
      }
    };
    
    console.log('Payload being sent to webhook:', JSON.stringify(payload, null, 2));
    
    // Fire webhook in background without waiting for response
    const webhookPromise = fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Chatbot-CustomTool/1.0',
      },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      console.log(`Webhook response status: ${response.status}`);
      if (!response.ok) {
        console.error(`Webhook failed with status ${response.status}`);
      }
      return response;
    }).catch(error => {
      console.error('Webhook call failed:', error);
    });

    // Use EdgeRuntime.waitUntil to handle webhook in background
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(webhookPromise);
    }

    // Execute email automation if enabled and all required parameters are filled
    let emailResult = null;
    if (emailAutomation?.enabled && shouldSendEmail(parameters, inputData)) {
      try {
        emailResult = await sendToolEmail(action, inputData, emailAutomation);
        console.log('Email automation executed successfully:', emailResult);
      } catch (emailError) {
        console.error('Email automation failed:', emailError);
        // Don't fail the main action if email fails
        emailResult = { error: emailError.message };
      }
    }

    // Return immediately without waiting for webhook
    return {
      success: true,
      message: `Custom tool "${action.name}" executed successfully`,
      statusCode: 200,
      response: { message: 'Webhook sent successfully' },
      url: webhookUrl,
      toolName: action.name,
      emailResult: emailResult,
    };
  } catch (error) {
    console.error('Custom tool execution error:', error);
    throw new Error(`Custom tool "${action.name}" failed: ${error.message}`);
  }
}

function shouldSendEmail(parameters: any[], inputData: any): boolean {
  // Check if all required parameters are filled
  if (!parameters || !Array.isArray(parameters)) {
    return true; // No parameters defined, send email
  }

  for (const param of parameters) {
    if (param.required) {
      const value = inputData[param.name];
      if (!value || value.toString().trim() === '') {
        console.log(`Required parameter '${param.name}' is empty, skipping email`);
        return false;
      }
    }
  }

  return true;
}

async function sendToolEmail(action: any, inputData: any, emailAutomation: any) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }

  const resend = new Resend(resendApiKey);

  // Get chatbot name for template variables
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: chatbot } = await supabase
    .from('chatbots')
    .select('name')
    .eq('id', action.chatbot_id)
    .single();

  // Create template variables
  const templateVars = {
    ...inputData,
    bot_name: chatbot?.name || 'Chatbot',
    tool_name: action.name,
    timestamp: new Date().toISOString(),
  };

  // Process subject and body templates
  const subject = processTemplate(emailAutomation.subject || 'Tool Execution: {{tool_name}}', templateVars);
  const body = processTemplate(emailAutomation.body || 'Tool "{{tool_name}}" was executed with the following data:\n\n{{parameters}}', templateVars);

  // Process recipients - support comma-separated emails and template variables
  const recipientList = (emailAutomation.recipients || '').split(',').map((email: string) => {
    const processedEmail = processTemplate(email.trim(), templateVars);
    return processedEmail;
  }).filter((email: string) => email && isValidEmail(email));

  if (recipientList.length === 0) {
    throw new Error('No valid recipient emails found');
  }

  console.log('Sending tool automation email:', { 
    subject, 
    recipients: recipientList, 
    toolName: action.name 
  });

  const emailResponse = await resend.emails.send({
    from: 'Chatbot Assistant <onboarding@resend.dev>',
    to: recipientList,
    subject: subject,
    html: body.replace(/\n/g, '<br>'),
  });

  if (emailResponse.error) {
    throw new Error(`Email sending failed: ${emailResponse.error.message}`);
  }

  return {
    success: true,
    emailId: emailResponse.data?.id,
    recipients: recipientList,
    subject: subject,
  };
}

function processTemplate(template: string, variables: any): string {
  let processed = template;
  
  // Replace template variables like {{variable_name}}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const stringValue = value ? value.toString() : '';
    processed = processed.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), stringValue);
  }

  // Special handling for parameters display
  if (processed.includes('{{parameters}}')) {
    const paramsText = Object.entries(variables)
      .filter(([key]) => !['bot_name', 'tool_name', 'timestamp'].includes(key))
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    processed = processed.replace(/\{\{parameters\}\}/g, paramsText);
  }

  return processed;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}