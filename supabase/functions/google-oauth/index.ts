import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
const GOOGLE_REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth/callback`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Handle OAuth callback
  if (url.pathname.includes('/callback')) {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state'); // user ID
    
    if (error) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Calendar - Connection Error</title>
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background: #f8fafc;
              }
              .container { 
                text-align: center; 
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .error { color: #dc2626; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Connection Failed</div>
              <p>Error: ${error}</p>
              <p>This window will close shortly...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth_error', error: '${error}' }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';",
        },
      });
    }

    if (!code || !state) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Calendar - Missing Code</title>
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background: #f8fafc;
              }
              .container { 
                text-align: center; 
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .error { color: #dc2626; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Authorization Failed</div>
              <p>No authorization code received from Google.</p>
              <p>This window will close shortly...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth_error', error: 'No authorization code received' }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';",
        },
      });
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_REDIRECT_URI,
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      // Create Supabase client with service role key for server-side operations
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Store tokens in database
      const { error: dbError } = await supabase
        .from('oauth_tokens')
        .upsert({
          user_id: state, // This is the user ID from the state parameter
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to store tokens');
      }

      return new Response(`<script>
if(window.opener){window.opener.postMessage({type:'oauth_success'},'*');}
window.close();
</script>`, {
        headers: { 
          'Content-Type': 'text/html',
        }
      });
    } catch (error) {
      console.error('Token exchange error:', error);
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Calendar - Token Exchange Error</title>
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background: #f8fafc;
              }
              .container { 
                text-align: center; 
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .error { color: #dc2626; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Token Exchange Failed</div>
              <p>Error: ${error.message}</p>
              <p>This window will close shortly...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth_error', error: '${error.message}' }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline';",
        },
      });
    }
  }

  // Return OAuth configuration for client-side initiation
  if (url.pathname.includes('/config')) {
    return new Response(JSON.stringify({
      clientId: GOOGLE_CLIENT_ID,
      redirectUri: GOOGLE_REDIRECT_URI,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email',
      ]
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  // This endpoint should only handle callbacks and config, not initiate OAuth
  return new Response('OAuth initiation should be done from the client', {
    status: 400,
    headers: corsHeaders,
  });
});