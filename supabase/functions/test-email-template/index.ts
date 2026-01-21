import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to render email template
const renderEmailTemplate = (template: string, data: any): string => {
  let rendered = template;
  
  // Replace template variables
  const variables = {
    user_name: data.user_name || 'Valued Customer',
    bot_name: data.bot_name || 'Your Chatbot',
    conversation_summary: data.conversation_summary || 'Test conversation summary with mock data',
    timestamp: data.timestamp || new Date().toLocaleDateString(),
    first_message: data.first_message || 'This is a test first message from a user',
    last_message: data.last_message || 'This is a test last message to show how the template works'
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
    const { chatbotId, email, template } = await req.json();

    if (!chatbotId || !email || !template) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chatbotId, email, and template" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get chatbot info for mock data
    const { data: chatbot } = await supabase
      .from('chatbots')
      .select('name')
      .eq('id', chatbotId)
      .single();

    // Prepare mock template data
    const mockData = {
      user_name: 'John Doe',
      bot_name: chatbot?.name || 'TestBot',
      conversation_summary: 'This is a test conversation summary. The user inquired about your services, asked several questions about pricing, and showed interest in scheduling a demo call.',
      timestamp: new Date().toLocaleString(),
      first_message: 'Hi there! I\'m interested in learning more about your services.',
      last_message: 'Thank you for all the information. I\'ll review it and get back to you soon!',
      messages: [
        { role: 'user', content: 'Hi there! I\'m interested in learning more about your services.' },
        { role: 'assistant', content: 'Hello! I\'d be happy to help you learn about our services. What specific area are you most interested in?' },
        { role: 'user', content: 'I\'m looking for pricing information on your premium package.' },
        { role: 'assistant', content: 'Great! Our premium package includes comprehensive features. Let me share the pricing details with you.' },
        { role: 'user', content: 'Thank you for all the information. I\'ll review it and get back to you soon!' }
      ],
      message_count: 5,
      duration_minutes: 15,
      user_rating: 4,
      summary_sentiment: 'positive'
    };

    // Render the template with mock data
    const renderedContent = renderEmailTemplate(template, mockData);

    // Send test email using the basic-email function
    const { error } = await supabase.functions.invoke('basic-email', {
      body: {
        email: email,
        subject: `🧪 Test Email - ${chatbot?.name || 'Chatbot'} Template Preview`,
        testMessage: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #3b82f6; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">🧪 Test Email - Custom Template Preview</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
              <p style="background-color: #fef3c7; padding: 10px; border-radius: 4px; margin: 0 0 20px 0;">
                <strong>📧 This is a test of your custom email template using mock conversation data.</strong>
              </p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #374151;">Mock Test Data Used:</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280;">
                  <li>User: John Doe</li>
                  <li>Bot: ${chatbot?.name || 'TestBot'}</li>
                  <li>Messages: 5 total (3 user, 2 bot)</li>
                  <li>Content includes: pricing inquiry, services information</li>
                  <li>Rating: 4/5 stars</li>
                </ul>
              </div>
              <hr style="margin: 20px 0; border: 1px solid #e2e8f0;">
              <div style="white-space: pre-line; line-height: 1.6;">
                ${renderedContent.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
        `
      }
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent successfully to ${email}`,
        preview: renderedContent 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in test-email-template function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);