import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch chatbot configuration - allow inactive for testing
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      return new Response('Chatbot not found', { status: 404 });
    }

    // Fetch FAQs for the chatbot
    const { data: faqs, error: faqsError } = await supabase
      .from('chatbot_faqs')
      .select('question, answer')
      .eq('chatbot_id', chatbotId)
      .eq('is_active', true)
      .order('sort_order');

    if (faqsError) {
      console.error('Error fetching FAQs:', faqsError);
    }

    // Generate unique visitor ID for this session
    const visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

    // Generate the messenger JavaScript with proper escaping
    const messengerScript = `
(function() {
  // Prevent multiple initialization
  if (window.voxtroMessengerInitialized) return;
  window.voxtroMessengerInitialized = true;

  // Configuration with properly escaped values
  const chatbotConfig = ${JSON.stringify({
    id: chatbot.id,
    name: chatbot.name,
    description: chatbot.description || 'How can I help you today?',
    themeColor: chatbot.theme_color || '#3b82f6',
    welcomeMessage: chatbot.welcome_message || 'Hi! How can I help you today?',
    faqs: faqs || []
  })};

  const visitorId = "${visitorId}";
  let conversationId = null;

  // Create full-screen messenger
  const createMessenger = function() {
    const config = chatbotConfig;
    
    // Build FAQ section
    let faqsHTML = '';
    if (config.faqs && config.faqs.length > 0) {
      const faqButtons = config.faqs.map(faq => 
        \`<div class="faq-question" onclick="sendMessage('\${faq.question.replace(/'/g, "\\\\'")}')">$\{faq.question}</div>\`
      ).join('');
      
      faqsHTML = \`
        <div class="faq-section">
          <div class="faq-questions">$\{faqButtons}</div>
        </div>\`;
    }

    // Complete HTML with embedded JavaScript
    return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>$\{config.name} - Messenger</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, $\{config.themeColor}15 0%, $\{config.themeColor}08 100%);
      height: 100vh; height: 100dvh; overflow: hidden;
    }
    @supports (height: 100dvh) { body { height: 100dvh; } }
    .messenger-container {
      display: flex; flex-direction: column; height: 100vh; height: 100dvh;
      max-width: 800px; margin: 0 auto; background: white;
      box-shadow: 0 0 40px rgba(0,0,0,0.1);
    }
    @supports (height: 100dvh) { .messenger-container { height: 100dvh; } }
    .messenger-header {
      background: $\{config.themeColor}; color: white; padding: 20px;
      text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .messenger-header h1 { font-size: 24px; margin-bottom: 5px; }
    .messenger-header p { opacity: 0.9; font-size: 14px; }
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 20px; display: flex;
      flex-direction: column; gap: 15px; scroll-behavior: smooth;
      padding-bottom: env(safe-area-inset-bottom, 20px); min-height: 0;
    }
    .message {
      max-width: 80%; padding: 12px 16px; border-radius: 18px;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message.bot { align-self: flex-start; background: #f1f5f9; color: #1e293b; }
    .message.user { align-self: flex-end; background: $\{config.themeColor}; color: white; }
    .typing-indicator {
      display: none; align-items: center; gap: 8px; padding: 12px 16px;
      max-width: 80px; background: #f1f5f9; border-radius: 18px; margin-bottom: 15px;
    }
    .typing-indicator.show { display: flex; }
    .typing-dot {
      width: 8px; height: 8px; background: #94a3b8; border-radius: 50%;
      animation: typing 1.5s infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-10px); }
    }
    .powered-by {
      padding: 15px 20px 10px; text-align: center; color: #9ca3af;
      font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .powered-by svg { width: 16px; height: 16px; opacity: 0.7; }
    .end-conversation-container { padding: 0 20px 15px; background: white; }
    .end-conversation-button {
      background: transparent; color: #6b7280; border: 1px solid #e5e7eb;
      border-radius: 25px; padding: 12px 24px; font-size: 14px; cursor: pointer;
      transition: all 0.2s; width: 100%; text-align: center;
    }
    .end-conversation-button:hover {
      background: #f9fafb; border-color: #d1d5db; color: #374151;
    }
    .chat-input-container {
      padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #f1f5f9; background: white; position: sticky; bottom: 0;
    }
    .input-wrapper { display: flex; gap: 8px; align-items: center; }
    .chat-input {
      flex: 1; padding: 12px 16px; border: 2px solid #e2e8f0;
      border-radius: 25px; font-size: 16px; outline: none; transition: border-color 0.2s;
    }
    .chat-input:focus { border-color: $\{config.themeColor}; }
    .send-button {
      background: $\{config.themeColor}; color: white; border: none;
      border-radius: 50%; width: 44px; height: 44px; display: flex;
      align-items: center; justify-content: center; cursor: pointer;
      transition: all 0.2s; font-size: 18px;
    }
    .send-button:hover { background: $\{config.themeColor}dd; transform: scale(1.05); }
    .send-button:active { transform: scale(0.95); }
    .send-button:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
    .faq-section { padding: 0 20px 20px; }
    .faq-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #374151; }
    .faq-questions { display: flex; flex-wrap: wrap; gap: 8px; }
    .faq-question {
      background: $\{config.themeColor}15; color: $\{config.themeColor};
      border: 1px solid $\{config.themeColor}30; padding: 8px 12px;
      border-radius: 15px; font-size: 14px; cursor: pointer; transition: all 0.2s;
    }
    .faq-question:hover {
      background: $\{config.themeColor}25; transform: translateY(-1px);
    }
    @media (max-width: 768px) {
      .messenger-container { max-width: 100%; height: 100vh; height: 100dvh; }
      @supports (height: 100dvh) { .messenger-container { height: 100dvh; } }
      .message { max-width: 90%; }
      .messenger-header { padding: 15px; }
      .messenger-header h1 { font-size: 20px; }
      .chat-input-container { padding: 15px; padding-bottom: calc(15px + env(safe-area-inset-bottom, 0px)); }
      .end-conversation-container { padding: 0 15px 12px; }
      .powered-by { padding: 12px 15px 8px; }
      .chat-messages { padding: 15px; min-height: 200px; }
    }
  </style>
</head>
<body>
  <div class="messenger-container">
    <div class="messenger-header">
      <h1>$\{config.name}</h1>
      <p>$\{config.description}</p>
    </div>
    <div class="chat-messages" id="chatMessages">
      <div class="message bot">$\{config.welcomeMessage}</div>
    </div>
    <div class="typing-indicator" id="typingIndicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
    $\{faqsHTML}
    <div class="powered-by">
      <img src="https://ik.imagekit.io/wrewtbha2/voxtrofavicon.png?updatedAt=1752758574810" alt="Voxtro" style="width: 16px; height: 16px; object-fit: contain;" />
      Powered by Voxtro
    </div>
    <div class="end-conversation-container">
      <button class="end-conversation-button" onclick="endConversation()">End Conversation</button>
    </div>
    <div class="chat-input-container">
      <div class="input-wrapper">
        <input type="text" class="chat-input" id="chatInput" placeholder="Message..." onkeypress="handleKeyPress(event)">
        <button class="send-button" id="sendButton" onclick="sendCurrentMessage()">➤</button>
      </div>
    </div>
  </div>

  <script>
    const config = ${JSON.stringify({
      id: chatbot.id,
      name: chatbot.name,
      description: chatbot.description || 'How can I help you today?',
      themeColor: chatbot.theme_color || '#3b82f6',
      welcomeMessage: chatbot.welcome_message || 'Hi! How can I help you today?'
    })};
    
    const visitorId = "${visitorId}";
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const typingIndicator = document.getElementById('typingIndicator');
    let conversationId = null;
    let messages = [
      { role: 'assistant', content: config.welcomeMessage }
    ]; // Store full conversation history starting with welcome message

    function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTyping() {
      typingIndicator.classList.add('show');
      sendButton.disabled = true;
      scrollToBottom();
    }

    function hideTyping() {
      typingIndicator.classList.remove('show');
      sendButton.disabled = false;
    }

    function addMessage(content, isUser, formData = null) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ' + (isUser ? 'user' : 'bot');
      messageDiv.textContent = content;
      chatMessages.appendChild(messageDiv);
      
      // If form data is provided, render the form
      if (formData && !isUser) {
        const formContainer = document.createElement('div');
        formContainer.className = 'form-container';
        formContainer.style.cssText = 'margin-top: 15px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;';
        
        const form = createForm(formData);
        formContainer.appendChild(form);
        chatMessages.appendChild(formContainer);
      }
      
      scrollToBottom();
    }

    function createForm(formData) {
      const form = document.createElement('form');
      form.style.cssText = 'display: flex; flex-direction: column; gap: 15px;';
      
      // Form title
      const title = document.createElement('h3');
      title.textContent = formData.form_title;
      title.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: #1e293b;';
      form.appendChild(title);
      
      // Form description
      if (formData.form_description) {
        const description = document.createElement('p');
        description.textContent = formData.form_description;
        description.style.cssText = 'margin: 0; color: #64748b; font-size: 14px;';
        form.appendChild(description);
      }
      
      const formValues = {};
      
      // Create form fields
      formData.fields.forEach(field => {
        const fieldContainer = document.createElement('div');
        fieldContainer.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
        
        const label = document.createElement('label');
        label.textContent = field.label + (field.required ? ' *' : '');
        label.style.cssText = 'font-weight: 500; color: #374151; font-size: 14px;';
        fieldContainer.appendChild(label);
        
        let input;
        
        switch (field.type) {
          case 'textarea':
            input = document.createElement('textarea');
            input.rows = 3;
            break;
          case 'select':
            input = document.createElement('select');
            if (field.options) {
              const defaultOption = document.createElement('option');
              defaultOption.value = '';
              defaultOption.textContent = field.placeholder || 'Select an option';
              input.appendChild(defaultOption);
              
              field.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                input.appendChild(optionElement);
              });
            }
            break;
          default:
            input = document.createElement('input');
            input.type = field.type;
        }
        
        input.placeholder = field.placeholder || '';
        input.required = field.required || false;
        input.style.cssText = 'padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;';
        
        input.addEventListener('focus', () => {
          input.style.borderColor = config.themeColor;
        });
        
        input.addEventListener('blur', () => {
          input.style.borderColor = '#d1d5db';
        });
        
        input.addEventListener('input', () => {
          formValues[field.id] = input.value;
        });
        
        fieldContainer.appendChild(input);
        form.appendChild(fieldContainer);
      });
      
      // Submit button
      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.textContent = 'Submit Form';
      submitButton.style.cssText = 'background: ' + config.themeColor + '; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.2s;';
      
      submitButton.addEventListener('mouseenter', () => {
        submitButton.style.opacity = '0.9';
      });
      
      submitButton.addEventListener('mouseleave', () => {
        submitButton.style.opacity = '1';
      });
      
      form.appendChild(submitButton);
      
      // Form submission
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm(formData.id, formValues, form);
      });
      
      return form;
    }
    
    function submitForm(formId, formValues, formElement) {
      const submitButton = formElement.querySelector('button[type="submit"]');
      submitButton.textContent = 'Submitting...';
      submitButton.disabled = true;
      
      fetch('https://nzqzmvsrsfynatxojuil.supabase.co/functions/v1/form-submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formId: formId,
          submittedData: formValues,
          conversationId: conversationId,
          visitorId: visitorId
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          addMessage(data.message || 'Thank you for submitting the form!');
          messages.push({ role: 'assistant', content: data.message || 'Thank you for submitting the form!' });
          formElement.style.display = 'none';
        } else {
          throw new Error(data.error || 'Failed to submit form');
        }
      })
      .catch(error => {
        console.error('Error submitting form:', error);
        addMessage('Sorry, there was an error submitting your form. Please try again.');
        submitButton.textContent = 'Submit Form';
        submitButton.disabled = false;
      });
    }

    function endConversation() {
      conversationId = null;
      messages = [
        { role: 'assistant', content: config.welcomeMessage }
      ]; // Reset to welcome message
      chatMessages.innerHTML = '<div class="message bot">' + config.welcomeMessage + '</div>';
      scrollToBottom();
      chatInput.focus();
    }

    function sendCurrentMessage() {
      sendMessage(chatInput.value);
    }

    function sendMessage(message) {
      if (!message.trim()) return;
      
      addMessage(message, true);
      chatInput.value = '';
      showTyping();
      
      // Add to conversation history
      messages.push({ role: 'user', content: message });

      console.log('Sending message:', message);
      
      // Build the request payload with full conversation history
      const requestPayload = {
        chatbotId: config.id,
        messages: messages, // Send full conversation history like widget does
        visitorId: visitorId
      };
      
      // Include conversationId if we have one
      if (conversationId) {
        requestPayload.conversationId = conversationId;
      }

      console.log('Request payload:', requestPayload);

      fetch('https://nzqzmvsrsfynatxojuil.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      })
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        console.log('Response data:', data);
        
        // Store conversationId for future requests
        if (!conversationId && data.conversationId) {
          conversationId = data.conversationId;
        }
        
        hideTyping();
        
        if (data.response) {
          addMessage(data.response, false, data.formData);
          // Add AI response to conversation history
          messages.push({ role: 'assistant', content: data.response });
        } else if (data.error) {
          addMessage('Error: ' + data.error);
        } else {
          addMessage('Sorry, I encountered an error. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        hideTyping();
        addMessage('Sorry, I encountered an error. Please try again.');
      });
    }

    function handleKeyPress(event) {
      if (event.key === 'Enter') {
        sendMessage(chatInput.value);
      }
    }

    window.addEventListener('load', function() {
      chatInput.focus();
    });
  </script>
</body>
</html>\`;
  };

  // Detect mobile device
  function isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // Open messenger in new window/tab or same tab on mobile
  window.openVoxtroMessenger = function() {
    if (isMobile()) {
      // On mobile, open in same tab to avoid popup blockers
      var currentUrl = window.location.href;
      document.write(createMessenger());
      document.close();
      // Store original URL to allow going back
      window.voxtroOriginalUrl = currentUrl;
    } else {
      // On desktop, open in new window
      var messengerWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (messengerWindow) {
        messengerWindow.document.write(createMessenger());
        messengerWindow.document.close();
      }
    }
  };

  // Auto-open messenger if specified
  var autoOpen = new URLSearchParams(window.location.search).get('autoOpen');
  if (autoOpen === 'true') {
    window.openVoxtroMessenger();
  }

  console.log('Voxtro messenger script loaded for chatbot:', chatbotConfig.name);
})();
`;

    return new Response(messengerScript, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error in messenger function:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});