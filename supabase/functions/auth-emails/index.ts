import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import React from 'npm:react@18.3.1';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PasswordResetEmail } from './_templates/password-reset.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SUPABASE_AUTH_EXTERNAL_EMAIL_HOOK_SECRET') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    console.log('Auth email webhook received');
    
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook if secret is provided
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      try {
        wh.verify(payload, headers);
      } catch (error) {
        console.error('Webhook verification failed:', error);
        return new Response('Unauthorized', { 
          status: 401,
          headers: corsHeaders 
        });
      }
    }

    const data = JSON.parse(payload);
    console.log('Parsed webhook data:', data);

    const {
      user,
      email_data: { 
        token, 
        token_hash, 
        redirect_to, 
        email_action_type,
        site_url 
      },
    } = data;

    console.log('Email action type:', email_action_type);
    console.log('User email:', user.email);

    let html = '';
    let subject = '';

    // Handle different email types
    switch (email_action_type) {
      case 'recovery':
        subject = 'Reset your password - Voxtro';
        
        // Force production URL for password reset
        const productionUrl = 'https://app.voxtro.io';
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            supabase_url: supabaseUrl,
            token,
            token_hash,
            redirect_to: productionUrl,
            email_action_type,
            site_url: productionUrl,
          })
        );
        break;
      
      case 'signup':
      case 'email_change':
      case 'invite':
        // For now, let Supabase handle these
        return new Response('Email type not handled by custom function', { 
          status: 200,
          headers: corsHeaders 
        });
      
      default:
        console.log('Unknown email action type:', email_action_type);
        return new Response('Unknown email type', { 
          status: 400,
          headers: corsHeaders 
        });
    }

    console.log('Sending email via Resend...');
    
    const { error } = await resend.emails.send({
      from: 'Voxtro <noreply@voxtro.com>',
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Email sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error in auth-emails function:', error);
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
        },
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
});