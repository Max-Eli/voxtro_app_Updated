import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = 'https://atmwldssfrbmcluvmelm.supabase.co';

serve(async (req) => {
  console.log('Form submit function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log('Processing form submission');

  try {
    const { formId, submittedData, conversationId, visitorId } = await req.json();

    if (!formId || !submittedData) {
      throw new Error('Missing required fields: formId, submittedData');
    }

    console.log('Form submission request:', JSON.stringify({
      formId,
      conversationId,
      visitorId,
      dataKeys: Object.keys(submittedData)
    }, null, 2));

    // Initialize Supabase client with service role key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    // Verify the form exists and is active
    const { data: formData, error: formError } = await supabase
      .from('chatbot_forms')
      .select('*, chatbots!inner(user_id, name)')
      .eq('id', formId)
      .eq('is_active', true)
      .single();

    if (formError || !formData) {
      console.error('Form not found or inactive:', formError);
      throw new Error('Form not found or inactive');
    }

    console.log('Found form:', formData.form_name);

    // Save the form submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert([{
        form_id: formId,
        conversation_id: conversationId,
        submitted_data: submittedData,
        visitor_id: visitorId,
        status: 'submitted'
      }])
      .select('*')
      .single();

    if (submissionError) {
      console.error('Failed to save form submission:', submissionError);
      throw new Error('Failed to save form submission');
    }

    console.log('Form submission saved:', submission.id);

    // Send email notification if enabled
    if (formData.notify_email && formData.notification_email) {
      try {
        console.log('Sending email notification to:', formData.notification_email);
        
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        
        // Format submitted data for email
        const formattedData = Object.entries(submittedData)
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join('<br>');
        
        const emailResponse = await resend.emails.send({
          from: 'Voxtro <noreply@voxtro.app>',
          to: [formData.notification_email],
          subject: formData.email_subject || 'New Form Submission',
          html: `
            <h2>${formData.email_subject || 'New Form Submission'}</h2>
            <p>A new form submission has been received for <strong>${formData.form_title}</strong> on chatbot <strong>${formData.chatbots.name}</strong>.</p>
            
            <h3>Submitted Information:</h3>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
              ${formattedData}
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent automatically by Voxtro when a form was submitted.
            </p>
          `,
        });

        console.log('Email notification sent successfully:', emailResponse);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the main request for email errors
      }
    }

    // Send webhook notification if enabled
    if (formData.webhook_enabled && formData.webhook_url) {
      try {
        console.log('Sending webhook notification to:', formData.webhook_url);
        
        const webhookPayload = {
          form_id: formId,
          form_name: formData.form_name,
          form_title: formData.form_title,
          chatbot_name: formData.chatbots.name,
          submission_id: submission.id,
          submitted_data: submittedData,
          visitor_id: visitorId,
          conversation_id: conversationId,
          submitted_at: submission.submitted_at,
          timestamp: new Date().toISOString()
        };

        const webhookResponse = await fetch(formData.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Voxtro-Webhook/1.0'
          },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          console.log('Webhook notification sent successfully:', webhookResponse.status);
        } else {
          console.error('Webhook notification failed:', webhookResponse.status, await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Failed to send webhook notification:', webhookError);
        // Don't fail the main request for webhook errors
      }
    }

    // Send notification to chatbot owner about new form submission
    if (formData.chatbots.user_id) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            userId: formData.chatbots.user_id,
            type: 'form_submission',
            chatbotName: formData.chatbots.name,
            formName: formData.form_name,
            submissionData: submittedData,
            conversationId: conversationId
          }
        });
        console.log('Form submission notification sent to user:', formData.chatbots.user_id);
      } catch (notificationError) {
        console.error('Failed to send form submission notification:', notificationError);
        // Don't fail the main request for notification errors
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      submissionId: submission.id,
      message: formData.success_message || 'Thank you for submitting the form!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in form submission:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while submitting the form',
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});