import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const chatbotId = pathParts[pathParts.length - 1]?.replace('.js', '');

  if (!chatbotId) {
    return new Response('Chatbot ID is required', { status: 400 });
  }

  try {
    console.log('Inline chat request for chatbot ID:', chatbotId);
    
    // Fetch chatbot details
    const { data: chatbot, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .eq('is_active', true)
      .single();

    if (error || !chatbot) {
      console.error('Chatbot not found:', error);
      return new Response(`// Chatbot not found or inactive
console.error('Chatbot ${chatbotId} not found or inactive');`, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript; charset=utf-8',
        },
      });
    }

    console.log('Found chatbot:', chatbot.name);

    // Fetch FAQs
    const { data: faqs } = await supabase
      .from('chatbot_faqs')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .eq('is_active', true)
      .order('sort_order');

    console.log('Found FAQs:', faqs?.length || 0);

    // Generate the inline chat JavaScript with proper JSON encoding
    const inlineChatCode = `
(function() {
  console.log('Voxtro inline chat loading...');
  
  var CHATBOT_ID = ${JSON.stringify(chatbotId)};
  var CHATBOT_NAME = ${JSON.stringify(chatbot.name?.trim() || 'Assistant')};
  var THEME_COLOR = ${JSON.stringify(chatbot.theme_color || '#3b82f6')};
  var WELCOME_MESSAGE = 'Hi! I am ' + CHATBOT_NAME + '. How can I help you today?';
  var FAQS = ${JSON.stringify(faqs || [])};

  var chatContainer = null;
  var isInitialized = false;

  window.showVoxtroChat = function(containerId) {
    console.log('showVoxtroChat called with:', containerId);
    if (!isInitialized) {
      initChat(containerId);
      isInitialized = true;
    }
  };

  function initChat(containerId) {
    console.log('Initializing chat...');
    
    var style = document.createElement('style');
    style.textContent = '' +
      '.voxtro-chat { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; width: 100%; height: 100%; background: white; display: flex; flex-direction: column; }' +
      '.voxtro-header { background: ' + THEME_COLOR + '; color: white; padding: 16px; display: flex; align-items: center; gap: 12px; }' +
      '.voxtro-avatar { width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: ' + THEME_COLOR + '; font-size: 14px; }' +
      '.voxtro-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }' +
      '.voxtro-message { padding: 12px 16px; border-radius: 16px; max-width: 80%; word-wrap: break-word; }' +
      '.voxtro-message.bot { background: #f1f5f9; color: #374151; align-self: flex-start; }' +
      '.voxtro-message.user { background: ' + THEME_COLOR + '; color: white; align-self: flex-end; }' +
      '.voxtro-input-area { padding: 16px; border-top: 1px solid #e5e7eb; }' +
      '.voxtro-input-wrapper { display: flex; gap: 8px; }' +
      '.voxtro-input { flex: 1; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 20px; outline: none; }' +
      '.voxtro-send { background: ' + THEME_COLOR + '; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; }' +
      '.voxtro-loading { font-style: italic; color: #6b7280; }';
    document.head.appendChild(style);

    chatContainer = document.createElement('div');
    chatContainer.className = 'voxtro-chat';
    chatContainer.innerHTML = '' +
      '<div class="voxtro-header">' +
        '<div class="voxtro-avatar">' + CHATBOT_NAME.charAt(0).toUpperCase() + '</div>' +
        '<h3 style="margin: 0; font-size: 16px;">' + CHATBOT_NAME + '</h3>' +
      '</div>' +
      '<div class="voxtro-messages" id="voxtro-messages">' +
        '<div class="voxtro-message bot">' + WELCOME_MESSAGE + '</div>' +
      '</div>' +
      '<div class="voxtro-input-area">' +
        '<div class="voxtro-input-wrapper">' +
          '<input id="voxtro-input" class="voxtro-input" placeholder="Type your message..." />' +
          '<button id="voxtro-send" class="voxtro-send">→</button>' +
        '</div>' +
      '</div>';

    var targetContainer = containerId ? document.getElementById(containerId) : document.body;
    if (targetContainer) {
      console.log('Mounting chat to:', targetContainer);
      targetContainer.appendChild(chatContainer);
    } else {
      console.error('Container not found:', containerId);
      document.body.appendChild(chatContainer);
    }

    var input = document.getElementById('voxtro-input');
    var sendBtn = document.getElementById('voxtro-send');
    var messages = document.getElementById('voxtro-messages');
    
    var conversationId = null;
    var visitorId = localStorage.getItem('voxtro_visitor_id') || 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('voxtro_visitor_id', visitorId);
    var messageHistory = [];

    function sendMessage() {
      var text = input.value.trim();
      if (!text) return;

      var userMsg = document.createElement('div');
      userMsg.className = 'voxtro-message user';
      userMsg.textContent = text;
      messages.appendChild(userMsg);
      
      messageHistory.push({ role: 'user', content: text });
      input.value = '';

      var loadingMsg = document.createElement('div');
      loadingMsg.className = 'voxtro-message bot voxtro-loading';
      loadingMsg.textContent = 'Typing...';
      messages.appendChild(loadingMsg);
      messages.scrollTop = messages.scrollHeight;

      fetch('https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId: CHATBOT_ID,
          messages: messageHistory,
          visitorId: visitorId,
          conversationId: conversationId
        })
      })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        messages.removeChild(loadingMsg);
        
        var botMsg = document.createElement('div');
        botMsg.className = 'voxtro-message bot';
        botMsg.textContent = data.response || 'Sorry, I encountered an error.';
        messages.appendChild(botMsg);
        
        messageHistory.push({ role: 'assistant', content: data.response });
        
        if (data.conversationId) {
          conversationId = data.conversationId;
        }
        
        messages.scrollTop = messages.scrollHeight;
      })
      .catch(function(error) {
        console.error('Chat error:', error);
        messages.removeChild(loadingMsg);
        
        var errorMsg = document.createElement('div');
        errorMsg.className = 'voxtro-message bot';
        errorMsg.textContent = 'Sorry, I encountered an error. Please try again.';
        messages.appendChild(errorMsg);
        
        messages.scrollTop = messages.scrollHeight;
      });
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
    
    console.log('Chat initialized successfully');
  }

  console.log('Voxtro chat script ready');
})();`;
    return new Response(inlineChatCode, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error generating inline chat:', error);
    return new Response('Internal server error', { status: 500 });
  }
});