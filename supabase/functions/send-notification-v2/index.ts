import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync, Html, Body, Container, Head, Heading, Text, Preview } from 'npm:@react-email/components@0.0.22';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailProps {
  chatbotName: string;
  type: 'chat_started' | 'chat_ended' | 'chat_error';
  conversationId?: string;
  errorMessage?: string;
}

const NotificationEmail = ({ chatbotName, type, conversationId, errorMessage }: NotificationEmailProps) => {
  let title = '';
  let content = '';
  
  switch (type) {
    case 'chat_started':
      title = 'New Conversation Started';
      content = `A user has just started a new conversation with your chatbot ${chatbotName}.`;
      break;
    case 'chat_ended':
      title = 'Conversation Ended';
      content = `A conversation with your chatbot ${chatbotName} has ended.`;
      break;
    case 'chat_error':
      title = 'Chat Error Occurred';
      content = `An error occurred in your chatbot ${chatbotName}.`;
      break;
  }

  return React.createElement(Html, {}, [
    React.createElement(Head, { key: 'head' }),
    React.createElement(Preview, { key: 'preview' }, title),
    React.createElement(Body, { key: 'body', style: { fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff' } }, [
      React.createElement(Container, { key: 'container', style: { maxWidth: '600px', margin: '0 auto', padding: '20px' } }, [
        React.createElement(Heading, { key: 'heading', style: { color: type === 'chat_error' ? '#e74c3c' : '#333', fontSize: '24px', marginBottom: '20px' } }, title),
        React.createElement(Text, { key: 'content', style: { color: '#333', fontSize: '16px', lineHeight: '1.5', marginBottom: '15px' } }, content),
        conversationId && React.createElement(Text, { key: 'conv-id', style: { color: '#666', fontSize: '14px', marginBottom: '15px' } }, `Conversation ID: ${conversationId}`),
        errorMessage && React.createElement(Text, { key: 'error', style: { backgroundColor: '#f8f9fa', padding: '10px', borderLeft: '4px solid #e74c3c', margin: '15px 0', color: '#333' } }, `Error: ${errorMessage}`),
        React.createElement(Text, { key: 'footer', style: { color: '#888', fontSize: '12px', marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' } }, 'You can change your notification preferences in your dashboard settings.')
      ])
    ])
  ]);
};

interface EmailTestRequest {
  email: string;
  testMessage: string;
}

interface NotificationRequest {
  userId: string;
  type: 'chat_started' | 'chat_ended' | 'chat_error';
  chatbotName: string;
  userEmail?: string;
  conversationId?: string;
  errorMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting email function...");
    
    // Get API key with multiple fallback methods
    let resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    console.log("Initial API key check:", resendApiKey ? "FOUND" : "NOT FOUND");
    console.log("All env vars:", JSON.stringify(Object.keys(Deno.env.toObject()), null, 2));
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found in environment");
      return new Response(JSON.stringify({ 
        error: "RESEND_API_KEY not found",
        debug: {
          envVars: Object.keys(Deno.env.toObject()),
          timestamp: new Date().toISOString()
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Creating Resend client...");
    const resend = new Resend(resendApiKey);
    
    const requestBody = await req.json();
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    // Handle both test and notification requests
    if ('testMessage' in requestBody) {
      // Test email request
      const { email, testMessage }: EmailTestRequest = requestBody;
      
      const html = await renderAsync(
        React.createElement(NotificationEmail, {
          chatbotName: "Test Bot",
          type: 'chat_started',
          conversationId: 'test-123'
        })
      );
      
      console.log("Sending test email to:", email);
      
      const emailResponse = await resend.emails.send({
        from: "Voxtro <notifications@resend.dev>",
        to: [email],
        subject: "Test Email - Voxtro Notifications",
        html: html,
      });

      console.log("Email sent:", emailResponse);

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        recipient: email 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      // Notification email request  
      const { userId, type, chatbotName, userEmail, conversationId, errorMessage }: NotificationRequest = requestBody;
      
      const html = await renderAsync(
        React.createElement(NotificationEmail, {
          chatbotName,
          type,
          conversationId,
          errorMessage
        })
      );
      
      let subject = '';
      switch (type) {
        case 'chat_started':
          subject = `New conversation started with ${chatbotName}`;
          break;
        case 'chat_ended':
          subject = `Conversation ended with ${chatbotName}`;
          break;
        case 'chat_error':
          subject = `Error occurred in ${chatbotName}`;
          break;
      }
      
      console.log("Sending notification email to:", userEmail);
      
      const emailResponse = await resend.emails.send({
        from: "Voxtro <notifications@resend.dev>",
        to: [userEmail!],
        subject,
        html: html,
      });

      console.log("Notification email sent:", emailResponse);

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        type,
        recipient: userEmail 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("ERROR in send-notification-v2:", error);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);