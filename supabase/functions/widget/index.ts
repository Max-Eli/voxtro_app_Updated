import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    const chatbotId = filename.replace('.js', '');

    console.log('Widget request for chatbot ID:', chatbotId, 'Timestamp:', new Date().toISOString());

    // Validate chatbot ID format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chatbotId)) {
      console.error('Invalid chatbot ID format:', chatbotId);
      return new Response(
        'console.error(\'Invalid chatbot ID format: ' + chatbotId + '\');',
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
        }
      );
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not found');
      return new Response(
        'console.error(\'Widget configuration error\');',
        { headers: { ...corsHeaders, 'Content-Type': 'application/javascript' } }
      );
    }

    const supabase = createClient('https://atmwldssfrbmcluvmelm.supabase.co', supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get chatbot configuration from database
    console.log('Querying chatbot with ID:', chatbotId);
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('name, theme_color, theme_color_type, theme_gradient_start, theme_gradient_end, theme_gradient_angle, is_active, welcome_message, widget_button_text, widget_position, widget_button_color, widget_text_color, widget_size, widget_border_radius, widget_custom_css, widget_form_buttons, widget_form_buttons_layout, hide_branding')
      .eq('id', chatbotId)
      .eq('is_active', true)
      .single();

    // Get FAQs for this chatbot
    const { data: faqs, error: faqsError } = await supabase
      .from('chatbot_faqs')
      .select('question, answer')
      .eq('chatbot_id', chatbotId)
      .eq('is_active', true)
      .order('sort_order')
      .limit(5); // Limit to 5 FAQs for widget display

    // Get forms referenced by widget form buttons
    let availableForms = [];
    const formButtons = Array.isArray(chatbot?.widget_form_buttons) ? chatbot.widget_form_buttons : [];
    
    if (formButtons.length > 0) {
      const formIds = formButtons.map(btn => btn.formId).filter(Boolean);
      if (formIds.length > 0) {
        const { data: forms, error: formsError } = await supabase
          .from('chatbot_forms')
          .select('id, form_name, form_title, form_description, fields, success_message, terms_and_conditions, require_terms_acceptance')
          .in('id', formIds)
          .eq('is_active', true);
        
        availableForms = forms || [];
        console.log('Fetched forms for widget buttons:', availableForms.length);
      }
    }

    console.log('Database query result:', { chatbot, chatbotError });

    if (chatbotError || !chatbot) {
      console.error('Chatbot not found or error:', chatbotError);
      return new Response(
        'console.error(\'Chatbot not found or inactive\');',
        { headers: { ...corsHeaders, 'Content-Type': 'application/javascript' } }
      );
    }

    console.log('Using chatbot data:', chatbot.name);

    const widgetScript = 
`(function() {
  'use strict';
  
  // Configuration with customization
  const CHATBOT_ID = ` + JSON.stringify(chatbotId) + `;
  const CHATBOT_NAME = ` + JSON.stringify(chatbot.name?.trim() || 'Assistant') + `;
  const THEME_COLOR = ` + JSON.stringify(chatbot.theme_color || '#3b82f6') + `;
  const THEME_COLOR_TYPE = ` + JSON.stringify((chatbot as any).theme_color_type || 'solid') + `;
  const THEME_GRADIENT_START = ` + JSON.stringify((chatbot as any).theme_gradient_start || '#3b82f6') + `;
  const THEME_GRADIENT_END = ` + JSON.stringify((chatbot as any).theme_gradient_end || '#8b5cf6') + `;
  const THEME_GRADIENT_ANGLE = ` + JSON.stringify((chatbot as any).theme_gradient_angle || 135) + `;
  const WELCOME_MESSAGE = ` + JSON.stringify((chatbot.welcome_message || "Hi! I'm here to help you. How can I assist you today?").trim()) + `;
  const FAQS = ` + JSON.stringify(faqs || []) + `;
  const API_BASE = 'https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1';
  const WIDGET_FORM_BUTTONS = ` + JSON.stringify(formButtons) + `;
  const AVAILABLE_FORMS = ` + JSON.stringify(availableForms) + `;
  
  // Widget customization
  const WIDGET_BUTTON_TEXT = ` + JSON.stringify(chatbot.widget_button_text || 'Chat with us') + `;
  const WIDGET_POSITION = ` + JSON.stringify(chatbot.widget_position || 'bottom-right') + `;
  const WIDGET_BUTTON_COLOR = ` + JSON.stringify(chatbot.widget_button_color || chatbot.theme_color || '#3b82f6') + `;
  const WIDGET_TEXT_COLOR = ` + JSON.stringify(chatbot.widget_text_color || '#ffffff') + `;
  const WIDGET_SIZE = ` + JSON.stringify(chatbot.widget_size || 'medium') + `;
  const WIDGET_BORDER_RADIUS = ` + JSON.stringify(chatbot.widget_border_radius || '50%') + `;
  const WIDGET_CUSTOM_CSS = ` + JSON.stringify(chatbot.widget_custom_css || '') + `;
  const WIDGET_FORM_BUTTONS_LAYOUT = ` + JSON.stringify(chatbot.widget_form_buttons_layout || 'vertical') + `;
  const HIDE_BRANDING = ` + JSON.stringify(chatbot.hide_branding || false) + `;` + `
  
  // Notification sound setup
  const NOTIFICATION_SOUND_URL = 'https://ik.imagekit.io/wrewtbha2/chime-alert-demo-309545.mp3';
  let notificationAudio = null;
  
  // Initialize audio by fetching and creating blob URL to bypass CSP
  (async function initAudio() {
    try {
      const response = await fetch(NOTIFICATION_SOUND_URL);
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      notificationAudio = new Audio(blobUrl);
      notificationAudio.volume = 0.5;
      console.log('🔊 Widget - Audio initialized with blob URL');
    } catch (error) {
      console.error('Failed to initialize notification audio:', error);
    }
  })();
  
  // Function to play notification sound
  function playNotificationSound() {
    console.log('🔔 Widget - playNotificationSound called');
    if (!notificationAudio) {
      console.log('⚠️ Widget - Audio not ready');
      return;
    }
    
    try {
      notificationAudio.currentTime = 0;
      notificationAudio.play()
        .then(() => console.log('✅ Widget - Sound played'))
        .catch(err => {
          console.log('⚠️ Widget - Sound blocked by browser (expected on first load):', err.message);
        });
    } catch (error) {
      console.error('❌ Widget - Error playing audio:', error);
    }
  }
  
  // Helper function to get theme background style
  const getThemeBackground = () => {
    if (THEME_COLOR_TYPE === 'gradient') {
      return 'linear-gradient(' + THEME_GRADIENT_ANGLE + 'deg, ' + THEME_GRADIENT_START + ', ' + THEME_GRADIENT_END + ')';
    }
    return THEME_COLOR;
  };
  
  const THEME_BACKGROUND = getThemeBackground();
  
  // Calculate position styles
  const getPositionStyles = () => {
    switch (WIDGET_POSITION) {
      case 'center':
        return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-center':
        return 'bottom: 20px; left: 50%; transform: translateX(-50%);';
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'top-center':
        return 'top: 20px; left: 50%; transform: translateX(-50%);';
      case 'bottom-right':
      default:
        return 'bottom: 20px; right: 20px;';
    }
  };
  
  // Calculate size styles
  const getSizeStyles = () => {
    switch (WIDGET_SIZE) {
      case 'small':
        return { width: '48px', height: '48px', fontSize: '12px' };
      case 'large':
        return { width: '80px', height: '80px', fontSize: '16px' };
      case 'medium':
      default:
        return { width: '60px', height: '60px', fontSize: '14px' };
    }
  };
  
  const sizeStyles = getSizeStyles();
  
  console.log('Voxtro widget initializing for chatbot:', CHATBOT_NAME);
  
  // Generate visitor ID
  let visitorId = localStorage.getItem('voxtro_visitor_id');
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('voxtro_visitor_id', visitorId);
  }
  
  // State
  let isOpen = false;
  let messages = [];
  let isLoading = false;
  let showSuggestions = true;
  let isWelcomeScreen = true; // Track if we're showing the welcome screen

  // Create widget HTML
  const createWidgetHTML = function() {
    const isTextButton = WIDGET_BORDER_RADIUS !== '50%' && WIDGET_BUTTON_TEXT && WIDGET_BUTTON_TEXT !== 'Chat with us';
    const showText = isTextButton || WIDGET_SIZE === 'large';
    const isHorizontalLayout = WIDGET_FORM_BUTTONS_LAYOUT === 'horizontal' && WIDGET_FORM_BUTTONS.length > 0;
    
    let html = '';
    
    // Add custom CSS if provided
    if (WIDGET_CUSTOM_CSS) {
      html += '<style>' + WIDGET_CUSTOM_CSS + '</style>';
    }
    
    html += '<div id="voxtro-widget" style="' +
      'position: fixed;' +
      getPositionStyles() +
      'z-index: 10000;' +
      'font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, sans-serif;' +
      '">';
    
    // Chat Button (only show separately if not in horizontal layout)
    if (!isHorizontalLayout) {
      html += '<div id="voxtro-button" style="' +
        'width: ' + (showText ? 'auto' : sizeStyles.width) + ';' +
        'height: ' + (showText ? 'auto' : sizeStyles.height) + ';' +
        'min-width: ' + (showText ? '120px' : sizeStyles.width) + ';' +
        'padding: ' + (showText ? '12px 16px' : '0') + ';' +
        'background: ' + WIDGET_BUTTON_COLOR + ';' +
        'color: ' + WIDGET_TEXT_COLOR + ';' +
        'border-radius: ' + WIDGET_BORDER_RADIUS + ';' +
        'cursor: pointer;' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'gap: 8px;' +
        'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' +
        'transition: all 0.3s ease;' +
        'font-size: ' + sizeStyles.fontSize + ';' +
        'font-weight: 600;' +
        'white-space: nowrap;' +
        '" onclick="toggleChat()">';
      
      if (showText) {
        // Text Button
        html += WIDGET_BUTTON_TEXT +
          '<svg id="voxtro-chat-icon" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="display: block;">' +
            '<path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
          '</svg>' +
          '<svg id="voxtro-close-icon" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="display: none;">' +
            '<path d="M7 10l5 5 5-5z"/>' +
          '</svg>';
      } else {
        // Icon Button
        html += '<svg id="voxtro-chat-icon" width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style="display: block;">' +
            '<path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
          '</svg>' +
          '<svg id="voxtro-close-icon" width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style="display: none;">' +
            '<path d="M7 10l5 5 5-5z"/>' +
          '</svg>';
      }
      
      html += '</div>';
    }
    
    // Form Buttons (including chat button if horizontal layout)
    if (WIDGET_FORM_BUTTONS.length > 0 || isHorizontalLayout) {
      // Helper function to get icon SVG inline
      const getIconSVG = function(iconType) {
        const iconMap = {
          'phone': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
          'email': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
          'message': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
          'user': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
          'chat': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>'
        };
        return iconMap[iconType] || iconMap['user'];
      };
      
      html += '<div id="voxtro-form-buttons" style="' +
        'position: absolute;' +
        'display: flex;' +
        'flex-direction: ' + (WIDGET_FORM_BUTTONS_LAYOUT === 'horizontal' ? 'row' : 'column') + ';' +
        'gap: ' + (WIDGET_FORM_BUTTONS_LAYOUT === 'horizontal' ? '8px' : '12px') + ';' +
        'opacity: 0;' +
        'transform: scale(0.9);' +
        'transition: all 0.3s ease;' +
        'pointer-events: none;' +
        (WIDGET_FORM_BUTTONS_LAYOUT === 'horizontal' ? 
          'width: auto; justify-content: center; align-items: center; border-radius: 12px; background: rgba(0,0,0,0.8); padding: 8px;' : 
          '') + 
      
      // Position form buttons based on widget position  
      (function() {
        switch (WIDGET_POSITION) {
          case 'bottom-left':
            return 'bottom: calc(100% + 20px); left: 0;';
          case 'bottom-center':
            return 'bottom: calc(100% + 20px); left: 50%; transform: translateX(-50%) scale(0.9);';
          case 'top-left':
            return 'top: calc(100% + 20px); left: 0;';
          case 'top-right':
            return 'top: calc(100% + 20px); right: 0;';
          case 'top-center':
            return 'top: calc(100% + 20px); left: 50%; transform: translateX(-50%) scale(0.9);';
          case 'bottom-right':
          default:
            return 'bottom: calc(100% + 20px); right: 0;';
        }
      })() +
      '">';
      
      // Add chat button first if horizontal layout
      if (isHorizontalLayout) {
        html += '<div id="voxtro-button-inline" onclick="toggleChat()" style="' +
          'background: ' + WIDGET_BUTTON_COLOR + ';' +
          'color: ' + WIDGET_TEXT_COLOR + ';' +
          'border: none;' +
          'border-radius: 8px;' +
          'padding: 12px 16px;' +
          'cursor: pointer;' +
          'display: flex;' +
          'flex-direction: column;' +
          'align-items: center;' +
          'justify-content: center;' +
          'gap: 4px;' +
          'font-size: 11px;' +
          'font-weight: 500;' +
          'white-space: nowrap;' +
          'transition: all 0.2s ease;' +
          'min-width: 60px;' +
          'text-align: center;' +
          'flex: 0 0 auto;' +
          'opacity: 0.9;' +
          '" onmouseover="this.style.opacity=\\'1\\'" onmouseout="this.style.opacity=\\'0.9\\'">' +
          getIconSVG('chat').replace('width="16" height="16"', 'width="18" height="18"') + 
          '<span style="font-size: 10px; margin-top: 2px;">AI Chat</span>' +
        '</div>';
      }
      
      // Generate form buttons
      WIDGET_FORM_BUTTONS.forEach((button, index) => {
        const buttonColor = button.color || THEME_BACKGROUND;
        const isHorizontal = WIDGET_FORM_BUTTONS_LAYOUT === 'horizontal';
        html += '<div onclick="openForm(\\'' + button.formId + '\\')" style="' +
          'background: ' + buttonColor + ';' +
          'color: white;' +
          'border: none;' +
          'border-radius: ' + (isHorizontal ? '8px' : '12px') + ';' +
          'padding: ' + (isHorizontal ? '12px 16px' : '12px 16px') + ';' +
          'cursor: pointer;' +
          'display: flex;' +
          'flex-direction: ' + (isHorizontal ? 'column' : 'row') + ';' +
          'align-items: center;' +
          'justify-content: center;' +
          'gap: ' + (isHorizontal ? '4px' : '8px') + ';' +
          'font-size: ' + (isHorizontal ? '11px' : '14px') + ';' +
          'font-weight: ' + (isHorizontal ? '500' : '600') + ';' +
          'white-space: nowrap;' +
          'transition: all 0.2s ease;' +
          'min-width: ' + (isHorizontal ? '60px' : '120px') + ';' +
          'text-align: center;' +
          (isHorizontal ? 'flex: 0 0 auto; opacity: 0.9;' : '') +
          '" onmouseover="this.style.' + (isHorizontal ? 'opacity=\\'1\\'' : 'background=\\'' + buttonColor + 'dd\\'') + '" onmouseout="this.style.' + (isHorizontal ? 'opacity=\\'0.9\\'' : 'background=\\'' + buttonColor + '\\'') + '">' +
          (isHorizontal ? 
            getIconSVG(button.icon).replace('width="16" height="16"', 'width="18" height="18"') + '<span style="font-size: 10px; margin-top: 2px;">' + button.label + '</span>' :
            getIconSVG(button.icon) + '<span>' + button.label + '</span>'
          ) +
        '</div>';
      });
      
      html += '</div>';
    }
    
    // Chat Window positioning based on widget position
    const getChatWindowPosition = () => {
      switch (WIDGET_POSITION) {
        case 'center':
          return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
        case 'bottom-left':
          return 'bottom: calc(100% + 20px); left: 0;';
        case 'bottom-center':
          return 'bottom: calc(100% + 20px); left: 50%; transform: translateX(-50%);';
        case 'top-left':
          return 'top: calc(100% + 20px); left: 0;';
        case 'top-right':
          return 'top: calc(100% + 20px); right: 0;';
        case 'top-center':
          return 'top: calc(100% + 20px); left: 50%; transform: translateX(-50%);';
        case 'bottom-right':
        default:
          return 'bottom: calc(100% + 20px); right: 0;';
      }
    };
    
    const chatWindowPosition = getChatWindowPosition();
    
    html += '<div id="voxtro-chat" style="' +
      'display: none;' +
      'position: absolute;' +
      chatWindowPosition +
      'width: 380px;' +
      'height: 520px;' +
      'background: white;' +
      'border-radius: 16px;' +
      'box-shadow: 0 8px 32px rgba(0,0,0,0.15);' +
      'overflow: hidden;' +
      'flex-direction: column;' +
      '">';
    
    // Header
    html += '<div style="' +
      'background: ' + THEME_BACKGROUND + ';' +
      'color: white;' +
      'padding: 16px;' +
      'display: flex;' +
      'justify-content: space-between;' +
      'align-items: center;' +
      '">' +
        '<div style="display: flex; align-items: center; gap: 12px;">' +
          '<div style="' +
            'width: 32px;' +
            'height: 32px;' +
            'background: white;' +
            'border-radius: 50%;' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            '">' +
            '<span style="color: black; font-weight: bold; font-size: 14px;">' + CHATBOT_NAME.charAt(0).toUpperCase() + '</span>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight: 600; font-size: 16px; color: white;">' + CHATBOT_NAME + '</div>' +
          '</div>' +
        '</div>' +
        '<div id="voxtro-close-button" style="cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s ease; display: flex; align-items: center; justify-content: center;" onclick="window.toggleChat()" onmouseover="this.style.background=\\'rgba(255,255,255,0.1)\\'" onmouseout="this.style.background=\\'transparent\\'">' +
          '<svg width="20" height="20" fill="white" viewBox="0 0 24 24">' +
            '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' +
          '</svg>' +
        '</div>' +
      '</div>';
    
    // Messages container - initially show welcome screen
    html += '<div id="voxtro-messages" style="' +
      'flex: 1;' +
      'overflow-y: auto;' +
      'padding: 16px;' +
      'display: flex;' +
      'flex-direction: column;' +
      'gap: 16px;' +
      'background: white;' +
      'max-height: 350px;' +
      'align-items: flex-start;' +
      'text-align: left;' +
      '"></div>';
    
    // Welcome Screen (shown initially)
    html += '<div id="voxtro-welcome-screen" style="' +
      'flex: 1;' +
      'overflow-y: auto;' +
      'padding: 16px;' +
      'display: flex;' +
      'flex-direction: column;' +
      'gap: 16px;' +
      'background: white;' +
      'max-height: 350px;' +
      '">' +
        // Welcome Message with avatar
        '<div style="' +
          'display: flex;' +
          'align-items: flex-start;' +
          'gap: 12px;' +
          'max-width: 100%;' +
          'width: 100%;' +
          'justify-content: flex-start;' +
          '">' +
          '<div style="' +
            'width: 32px;' +
            'height: 32px;' +
            'background: #000000;' +
            'border-radius: 50%;' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'flex-shrink: 0;' +
            '">' +
            '<span style="color: white; font-weight: bold; font-size: 14px;">' + CHATBOT_NAME.charAt(0).toUpperCase() + '</span>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight: 600; font-size: 15px; color: #111827; margin-bottom: 4px;">Hi there! 👋</div>' +
            '<div style="color: #6b7280; font-size: 14px; line-height: 1.5;">' + WELCOME_MESSAGE + '</div>' +
          '</div>' +
        '</div>';
    
    // Add Start Chat button when no FAQs (inside welcome screen)
    if (FAQS.length === 0) {
      html += '<button onclick="startChat()" style="' +
        'width: 100%;' +
        'background: ' + THEME_BACKGROUND + ';' +
        'color: white;' +
        'border: none;' +
        'border-radius: 8px;' +
        'padding: 14px 16px;' +
        'font-size: 15px;' +
        'font-weight: 600;' +
        'cursor: pointer;' +
        'transition: all 0.2s ease;' +
        'font-family: inherit;' +
        'margin-top: auto;' +
        '" onmouseover="this.style.opacity=\\'0.9\\';" onmouseout="this.style.opacity=\\'1\\';">' +
        'Start Chat' +
      '</button>';
    }
    
    html += '</div>';
    
    // FAQ Quick Questions (shown in welcome screen, outside the welcome screen div)
    if (FAQS.length > 0) {
      html += createFAQBubbles();
    }
    
    // Powered by Footer
    html += '<div style="' +
      'padding: 8px 16px;' +
      'text-align: center;' +
      '">' +
        '<div style="' +
          'display: flex;' +
          'align-items: center;' +
          'justify-content: center;' +
          'gap: 8px;' +
          'font-size: 12px;' +
          'color: #9ca3af;' +
          'margin-bottom: 8px;' +
          '">' +
          (HIDE_BRANDING ? '' : 
            '<img src="https://ik.imagekit.io/wrewtbha2/voxtrofavicon.png?updatedAt=1752758574810" alt="Voxtro" style="width: 16px; height: 16px; object-fit: contain;" />' +
            '<span>Powered by Voxtro</span>'
          ) +
        '</div>' +
        '<div id="voxtro-end-conversation" style="display: none;">' +
          '<button onclick="endConversation()" style="' +
            'background: #f3f4f6;' +
            'border: 1px solid #e5e7eb;' +
            'color: #6b7280;' +
            'padding: 8px 16px;' +
            'border-radius: 20px;' +
            'font-size: 12px;' +
            'cursor: pointer;' +
            'transition: all 0.2s ease;' +
            'font-family: inherit;' +
            '" onmouseover="this.style.background=\\'#e5e7eb\\'; this.style.color=\\'#374151\\';" onmouseout="this.style.background=\\'#f3f4f6\\'; this.style.color=\\'#6b7280\\';" title="End current conversation and start fresh">' +
            'End Conversation' +
          '</button>' +
        '</div>' +
      '</div>';
    
    // Input (hidden initially on welcome screen)
    html += '<div id="voxtro-input-container" style="' +
      'padding: 16px;' +
      'display: none;' +
      'gap: 8px;' +
      'align-items: center;' +
      '">' +
        '<div style="flex: 1; position: relative;">' +
          '<input id="voxtro-input" type="text" placeholder="Message..." style="' +
            'width: 100%;' +
            'padding: 12px 16px;' +
            'border: none;' +
            'border-radius: 24px;' +
             'background: white;' +
             'color: #000000;' +
             'outline: none;' +
            'font-size: 16px;' +
            'transition: all 0.2s ease;' +
            'box-sizing: border-box;' +
            'box-shadow: 0 1px 3px rgba(0,0,0,0.1);' +
            '" onkeypress="handleKeyPress(event)" onfocus="this.style.boxShadow=\\'0 0 0 2px ' + THEME_BACKGROUND + ', 0 2px 8px rgba(0,0,0,0.15)\\';" onblur="this.style.boxShadow=\\'0 1px 3px rgba(0,0,0,0.1)\\';">' +
        '</div>' +
        '<button id="voxtro-send" onclick="sendMessage()" style="' +
          'width: 40px;' +
          'height: 40px;' +
          'background: ' + THEME_BACKGROUND + ';' +
          'color: white;' +
          'border: none;' +
          'border-radius: 50%;' +
          'cursor: pointer;' +
          'display: flex;' +
          'align-items: center;' +
          'justify-content: center;' +
          'transition: all 0.2s ease;' +
          'box-shadow: 0 1px 3px rgba(0,0,0,0.1);' +
          '" onmouseover="this.style.opacity=\\'0.9\\';" onmouseout="this.style.opacity=\\'1\\';">' +
          '<svg width="16" height="16" fill="white" viewBox="0 0 24 24">' +
            '<path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>' +
          '</svg>' +
        '</button>' +
      '</div>';
    
    html += '</div></div>';
    
    // Add form modal
    html += '<div id="voxtro-form-modal" style="' +
      'display: none;' +
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'width: 100%;' +
      'height: 100%;' +
      'background: rgba(0,0,0,0.5);' +
      'z-index: 10001;' +
      'justify-content: center;' +
      'align-items: center;' +
      '">' +
        '<div id="voxtro-form-content" style="' +
          'background: white;' +
          'border-radius: 16px;' +
          'box-shadow: 0 8px 32px rgba(0,0,0,0.15);' +
          'width: 90%;' +
          'max-width: 500px;' +
          'max-height: 90vh;' +
          'overflow-y: auto;' +
          'position: relative;' +
          '">' +
        '</div>' +
      '</div>';
    
    return html;
  };

  // Helper function to get icon SVG
  const getIconSVG = function(iconType) {
    const iconMap = {
      'phone': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
      'email': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
      'message': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
      'user': '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
    };
    return iconMap[iconType] || iconMap['user'];
  };

  // Create FAQ list with section title
  const createFAQBubbles = function() {
    let faqHtml = '<div id="voxtro-faq-container" style="padding: 0 16px 16px 16px; display: flex; flex-direction: column; gap: 12px;">';
    
    // Section title
    faqHtml += '<div style="font-weight: 600; font-size: 16px; color: #111827; margin-bottom: 4px;">Frequently Asked Questions:</div>';
    
    // Scrollable FAQ list
    faqHtml += '<div style="display: flex; flex-direction: column; gap: 0; max-height: 200px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">';
    
    for (let i = 0; i < FAQS.length; i++) {
      const faq = FAQS[i];
      const escapedQuestion = faq.question.replace(/'/g, "\\\\'").replace(/"/g, '\\\\"');
      const isLast = i === FAQS.length - 1;
      
      faqHtml += '<button onclick="window.sendFAQ(\\'' + escapedQuestion + '\\')" style="';
      faqHtml += 'text-align: left; padding: 14px 16px; background: white; border: none;';
      faqHtml += (isLast ? '' : 'border-bottom: 1px solid #e5e7eb;');
      faqHtml += 'font-size: 14px; color: #374151; cursor: pointer;';
      faqHtml += 'transition: all 0.2s ease; line-height: 1.4; font-family: inherit;';
      faqHtml += 'display: flex; justify-content: space-between; align-items: center; gap: 12px;"';
      faqHtml += 'onmouseover="this.style.background=\\'#f9fafb\\';" onmouseout="this.style.background=\\'white\\';">';
      faqHtml += '<span style="flex: 1;">' + faq.question + '</span>';
      faqHtml += '<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="flex-shrink: 0; color: #9ca3af;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';
      faqHtml += '</button>';
    }
    
    faqHtml += '</div>';
    
    // "Chat with us" button
    faqHtml += '<button onclick="window.startChat()" style="';
    faqHtml += 'width: 100%; background: ' + THEME_BACKGROUND + '; color: white; border: none;';
    faqHtml += 'padding: 14px 16px; border-radius: 24px; font-size: 15px; font-weight: 600;';
    faqHtml += 'cursor: pointer; display: flex; align-items: center;';
    faqHtml += 'justify-content: center; gap: 8px; margin-top: 4px;">';
    faqHtml += '<svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    faqHtml += '<span>Chat with us</span>';
    faqHtml += '</button>';
    
    faqHtml += '</div>';
    return faqHtml;
  };

  // Function to hide FAQ suggestions (no longer needed with welcome screen)
  const hideFAQSuggestions = function() {
    // No-op: FAQs are on welcome screen only
  };

  // Functions
  window.toggleChat = function() {
    const chatWindow = document.getElementById('voxtro-chat');
    const chatIcon = document.getElementById('voxtro-chat-icon');
    const closeIcon = document.getElementById('voxtro-close-icon');
    const formButtons = document.getElementById('voxtro-form-buttons');
    const button = document.getElementById('voxtro-button');
    
    if (isOpen) {
      if (chatWindow) chatWindow.style.display = 'none';
      if (chatIcon) chatIcon.style.display = 'block';
      if (closeIcon) closeIcon.style.display = 'none';
      // Show form buttons when chat is closed
      if (formButtons && WIDGET_FORM_BUTTONS.length > 0) {
        formButtons.style.opacity = '1';
        // Handle different positions for transform
        if (WIDGET_POSITION === 'bottom-center' || WIDGET_POSITION === 'top-center') {
          formButtons.style.transform = 'translateX(-50%) scale(1)';
        } else {
          formButtons.style.transform = 'scale(1)';
        }
        formButtons.style.pointerEvents = 'auto';
      }
      // Remove chat-open class to restart animation
      if (button) button.classList.remove('chat-open');
      isOpen = false;
    } else {
      if (chatWindow) chatWindow.style.display = 'flex';
      if (chatIcon) chatIcon.style.display = 'none';
      if (closeIcon) closeIcon.style.display = 'block';
      // Hide form buttons when chat is open
      if (formButtons) {
        formButtons.style.opacity = '0';
        // Handle different positions for transform
        if (WIDGET_POSITION === 'bottom-center' || WIDGET_POSITION === 'top-center') {
          formButtons.style.transform = 'translateX(-50%) scale(0.9)';
        } else {
          formButtons.style.transform = 'scale(0.9)';
        }
        formButtons.style.pointerEvents = 'none';
      }
      // Add chat-open class to stop animation
      if (button) button.classList.add('chat-open');
      isOpen = true;
      
      // Show appropriate screen based on state
      const welcomeScreen = document.getElementById('voxtro-welcome-screen');
      const messagesContainer = document.getElementById('voxtro-messages');
      const faqContainer = document.getElementById('voxtro-faq-container');
      const inputContainer = document.getElementById('voxtro-input-container');
      
      if (isWelcomeScreen) {
        // Show welcome screen
        if (welcomeScreen) welcomeScreen.style.display = 'flex';
        if (faqContainer) faqContainer.style.display = 'flex';
        if (messagesContainer) messagesContainer.style.display = 'none';
        if (inputContainer) inputContainer.style.display = 'none';
      } else {
        // Show chat mode
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (faqContainer) faqContainer.style.display = 'none';
        if (messagesContainer) messagesContainer.style.display = 'flex';
        if (inputContainer) inputContainer.style.display = 'flex';
        const input = document.getElementById('voxtro-input');
        if (input) input.focus();
      }
    }
  };

  window.hideChat = function() {
    const chatWindow = document.getElementById('voxtro-chat');
    const chatIcon = document.getElementById('voxtro-chat-icon');
    const closeIcon = document.getElementById('voxtro-close-icon');
    const formButtons = document.getElementById('voxtro-form-buttons');
    
    if (isOpen) {
      chatWindow.style.display = 'none';
      chatIcon.style.display = 'block';
      closeIcon.style.display = 'none';
      if (formButtons) {
        formButtons.style.opacity = '0';
        formButtons.style.transform = 'scale(0.9)';
        formButtons.style.pointerEvents = 'none';
      }
      isOpen = false;
    }
  };

  // Form functions
  window.openForm = function(formId) {
    const form = AVAILABLE_FORMS.find(f => f.id === formId);
    if (!form) {
      console.error('Form not found:', formId);
      return;
    }
    
    const modal = document.getElementById('voxtro-form-modal');
    const content = document.getElementById('voxtro-form-content');
    
    // Generate form HTML
    let formHtml = '<div style="padding: 24px;">';
    
    // Header
    formHtml += '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">';
    formHtml += '<div>';
    formHtml += '<h2 style="font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">' + (form.form_title || form.form_name) + '</h2>';
    if (form.form_description) {
      formHtml += '<p style="color: #6b7280; margin: 0; font-size: 14px;">' + form.form_description + '</p>';
    }
    formHtml += '</div>';
    formHtml += '<button onclick="closeForm()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">&times;</button>';
    formHtml += '</div>';
    
    // Form
    formHtml += '<form id="voxtro-form-' + formId + '" onsubmit="submitForm(event, \\'' + formId + '\\'); return false;">';
    
    // Fields
    if (form.fields && Array.isArray(form.fields)) {
      for (let i = 0; i < form.fields.length; i++) {
        const field = form.fields[i];
        formHtml += '<div style="margin-bottom: 16px;">';
        formHtml += '<label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 14px;">';
        formHtml += field.label + (field.required ? ' *' : '');
        formHtml += '</label>';
        
        if (field.type === 'textarea') {
          formHtml += '<textarea name="' + field.id + '" placeholder="' + (field.placeholder || '') + '" ' + (field.required ? 'required' : '') + ' style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 80px; box-sizing: border-box;"></textarea>';
        } else if (field.type === 'select') {
          formHtml += '<select name="' + field.id + '" ' + (field.required ? 'required' : '') + ' style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; background: white; box-sizing: border-box;">';
          formHtml += '<option value="">Choose...</option>';
          if (field.options && Array.isArray(field.options)) {
            for (let j = 0; j < field.options.length; j++) {
              formHtml += '<option value="' + field.options[j] + '">' + field.options[j] + '</option>';
            }
          }
          formHtml += '</select>';
        } else {
          formHtml += '<input type="' + (field.type || 'text') + '" name="' + field.id + '" placeholder="' + (field.placeholder || '') + '" ' + (field.required ? 'required' : '') + ' style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit; box-sizing: border-box;">';
        }
        formHtml += '</div>';
      }
    }
    
    // Terms and Conditions
    if (form.require_terms_acceptance && form.terms_and_conditions) {
      formHtml += '<div style="margin-bottom: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">';
      formHtml += '<div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 12px;">';
      formHtml += '<p style="color: #6b7280; font-size: 12px; margin: 0; white-space: pre-wrap;">' + form.terms_and_conditions + '</p>';
      formHtml += '</div>';
      formHtml += '<label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 14px; color: #374151;">';
      formHtml += '<input type="checkbox" name="terms_accepted" required style="margin-top: 2px; flex-shrink: 0;">';
      formHtml += '<span>I accept the terms and conditions <span style="color: #dc2626;">*</span></span>';
      formHtml += '</label>';
      formHtml += '</div>';
    }
    
    // Submit button
    formHtml += '<button type="submit" style="width: 100%; background: ' + THEME_BACKGROUND + '; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; margin-top: 8px;" onmouseover="this.style.opacity=\\'0.9\\';" onmouseout="this.style.opacity=\\'1\\';">Submit</button>';
    formHtml += '</form>';
    formHtml += '</div>';
    
    content.innerHTML = formHtml;
    modal.style.display = 'flex';
  };
  
  window.closeForm = function() {
    const modal = document.getElementById('voxtro-form-modal');
    modal.style.display = 'none';
  };
  
  window.submitForm = async function(event, formId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    try {
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      
      const response = await fetch(API_BASE + '/form-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: formId,
          submittedData: data,
          conversationId: null, // Form submissions from widget don't have conversation context
          visitorId: visitorId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit form');
      }
      
      // Show success message
      const formObj = AVAILABLE_FORMS.find(f => f.id === formId);
      const successMessage = formObj?.success_message || 'Thank you for your submission!';
      
      const content = document.getElementById('voxtro-form-content');
      content.innerHTML = '<div style="padding: 40px; text-align: center;">' +
        '<div style="color: ' + THEME_BACKGROUND + '; font-size: 48px; margin-bottom: 16px;">✓</div>' +
        '<h3 style="color: #111827; margin: 0 0 8px 0; font-size: 20px;">Success!</h3>' +
        '<p style="color: #6b7280; margin: 0 0 24px 0; font-size: 14px;">' + successMessage + '</p>' +
        '<button onclick="closeForm()" style="background: ' + THEME_BACKGROUND + '; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;">Close</button>' +
      '</div>';
      
      // Auto-close after 3 seconds
      setTimeout(closeForm, 3000);
      
    } catch (error) {
      console.error('Form submission error:', error);
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
      
      // Show error message
      alert('Failed to submit form. Please try again.');
    }
  };

  window.handleKeyPress = function(event) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  window.sendMessage = async function() {
    const input = document.getElementById('voxtro-input');
    const message = input.value.trim();
    
    if (!message || isLoading) return;
    
    // Show end conversation button after first user message
    const endConversationBtn = document.getElementById('voxtro-end-conversation');
    if (endConversationBtn && messages.length === 0) {
      endConversationBtn.style.display = 'block';
    }
    
    // Clear input
    input.value = '';
    
    // Add user message
    addMessage(message, 'user');
    
    // Show loading
    isLoading = true;
    const loadingDiv = addMessage('', 'assistant', true);
    
    try {
      messages.push({ role: 'user', content: message });
      
      const response = await fetch(API_BASE + '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: CHATBOT_ID,
          messages: messages,
          visitorId: visitorId
        })
      });
      
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Rate limit error:', errorData.error || 'Too many requests');
        
        // Remove loading message
        loadingDiv.remove();
        
        // Show generic user-friendly message
        addMessage('I\\'m currently experiencing high demand. Please try again in a moment.', 'assistant');
        isLoading = false;
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Remove loading message
      loadingDiv.remove();
      
      // Add AI response
      addMessage(data.response, 'assistant');
      messages.push({ role: 'assistant', content: data.response });
      
    } catch (error) {
      console.error('Chat error:', error);
      loadingDiv.innerHTML = 'Sorry, I encountered an error. Please try again.';
      loadingDiv.style.background = '#fee2e2';
      loadingDiv.style.color = '#dc2626';
    } finally {
      isLoading = false;
    }
  };

  // Function to send FAQ question
  window.sendFAQ = function(question) {
    // Prevent duplicate submissions
    if (isLoading) return;
    
    // If on welcome screen, transition to chat mode
    if (isWelcomeScreen) {
      const welcomeScreen = document.getElementById('voxtro-welcome-screen');
      const messagesContainer = document.getElementById('voxtro-messages');
      const faqContainer = document.getElementById('voxtro-faq-container');
      const inputContainer = document.getElementById('voxtro-input-container');
      
      // Hide welcome screen and FAQ container
      if (welcomeScreen) welcomeScreen.style.display = 'none';
      if (faqContainer) faqContainer.style.display = 'none';
      
      // Show messages container and input
      if (messagesContainer) messagesContainer.style.display = 'flex';
      if (inputContainer) inputContainer.style.display = 'flex';
      
      // Add welcome message as first message
      addMessage(WELCOME_MESSAGE, 'assistant');
      
      isWelcomeScreen = false;
    }
    
    const input = document.getElementById('voxtro-input');
    input.value = question;
    sendMessage();
  };

  // Function to start chat manually (without FAQ)
  window.startChat = function() {
    if (isLoading) return;
    
    // Transition from welcome screen to chat mode
    const welcomeScreen = document.getElementById('voxtro-welcome-screen');
    const messagesContainer = document.getElementById('voxtro-messages');
    const faqContainer = document.getElementById('voxtro-faq-container');
    const inputContainer = document.getElementById('voxtro-input-container');
    
    // Hide welcome screen and FAQ container
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (faqContainer) faqContainer.style.display = 'none';
    
    // Show messages container and input
    if (messagesContainer) messagesContainer.style.display = 'flex';
    if (inputContainer) inputContainer.style.display = 'flex';
    
    // Add welcome message as first message
    addMessage(WELCOME_MESSAGE, 'assistant');
    
    isWelcomeScreen = false;
    
    // Focus input
    const input = document.getElementById('voxtro-input');
    if (input) input.focus();
  };

  // Function to end current conversation and start fresh
  window.endConversation = async function() {
    // End conversation on backend first
    try {
      await fetch(API_BASE + '/detect-conversation-end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: CHATBOT_ID,
          visitorId: visitorId,
          forceEnd: true
        })
      });
    } catch (error) {
      console.error('Error ending conversation on backend:', error);
    }
    
    // Generate new visitor ID
    visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('voxtro_visitor_id', visitorId);
    
    // Clear messages array
    messages = [];
    
    // Reset to welcome screen
    isWelcomeScreen = true;
    
    // Hide end conversation button
    const endConversationBtn = document.getElementById('voxtro-end-conversation');
    if (endConversationBtn) {
      endConversationBtn.style.display = 'none';
    }
    
    // Clear messages container
    const messagesContainer = document.getElementById('voxtro-messages');
    messagesContainer.innerHTML = '';
    
    // Show welcome screen and hide chat mode
    const welcomeScreen = document.getElementById('voxtro-welcome-screen');
    const faqContainer = document.getElementById('voxtro-faq-container');
    const inputContainer = document.getElementById('voxtro-input-container');
    
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (faqContainer) faqContainer.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'none';
    
    // Clear input field
    const input = document.getElementById('voxtro-input');
    if (input) {
      input.value = '';
    }
    
    console.log('Conversation ended. New visitor ID:', visitorId);
  };

  // Format message content to handle markdown links and plain URLs
  const formatMessageContent = function(content) {
    // First handle markdown-style links [text](url)
    var markdownLinks = [];
    var tempContent = '';
    var i = 0;
    
    while (i < content.length) {
      if (content[i] === '[') {
        var textStart = i + 1;
        var textEnd = content.indexOf(']', textStart);
        if (textEnd !== -1 && content[textEnd + 1] === '(') {
          var urlStart = textEnd + 2;
          var urlEnd = content.indexOf(')', urlStart);
          if (urlEnd !== -1) {
            var linkText = content.substring(textStart, textEnd);
            var linkUrl = content.substring(urlStart, urlEnd);
            var linkId = markdownLinks.length;
            markdownLinks.push({ text: linkText, url: linkUrl });
            tempContent += '___MDLINK_' + linkId + '___';
            i = urlEnd + 1;
            continue;
          }
        }
      }
      tempContent += content[i];
      i++;
    }
    
    content = tempContent;
    
    // Convert plain URLs to clickable links (but not ones we already processed)
    content = content.replace(/(https?:\\/\\/[^\\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: ' + THEME_BACKGROUND + '; text-decoration: underline;">$1</a>');
    
    // Restore markdown links as HTML
    for (var j = 0; j < markdownLinks.length; j++) {
      var link = markdownLinks[j];
      content = content.replace('___MDLINK_' + j + '___', '<a href="' + link.url + '" target="_blank" rel="noopener noreferrer" style="color: ' + THEME_BACKGROUND + '; text-decoration: underline;">' + link.text + '</a>');
    }
    
    return content;
  };

  const addMessage = function(content, role, isLoading) {
    const messagesContainer = document.getElementById('voxtro-messages');
    const messageDiv = document.createElement('div');
    
    if (role === 'user') {
      messageDiv.style.cssText = 'display: flex !important; justify-content: flex-end !important; margin-bottom: 16px; width: 100%;';
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'background: ' + THEME_BACKGROUND + ' !important; color: white; padding: 16px; border-radius: 16px; border-top-right-radius: 6px; font-size: 14px; line-height: 1.5; max-width: 85%; text-align: left !important;';
      userBubble.innerHTML = content;
      messageDiv.appendChild(userBubble);
    } else {
      // Play notification sound for assistant messages (but not for loading messages)
      if (!isLoading) {
        playNotificationSound();
      }
      
      messageDiv.style.cssText = 'display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; max-width: 85%; width: 100%; justify-content: flex-start;';
      
      const avatar = document.createElement('div');
      avatar.style.cssText = 'width: 24px; height: 24px; background: #000000; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px;';
      avatar.innerHTML = '<span style="color: white; font-weight: bold; font-size: 10px;">' + CHATBOT_NAME.charAt(0).toUpperCase() + '</span>';
      
      const bubble = document.createElement('div');
      bubble.style.cssText = 'background: #f3f4f6; padding: 16px; border-radius: 16px; border-top-left-radius: 6px; color: #374151; font-size: 14px; line-height: 1.5; text-align: left;';
      
      if (isLoading) {
        // Create bouncing dots animation
        bubble.innerHTML = '<div style="display: flex; gap: 4px;">' +
          '<div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite; animation-delay: 0s;"></div>' +
          '<div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite; animation-delay: 0.2s;"></div>' +
          '<div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite; animation-delay: 0.4s;"></div>' +
        '</div>';
      } else {
        bubble.innerHTML = formatMessageContent(content);
      }
      
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(bubble);
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
  };

  // Mobile keyboard handler
  let initialViewportHeight = window.innerHeight;
  const handleMobileKeyboard = function() {
    const chatWindow = document.getElementById('voxtro-chat');
    if (!chatWindow || !isOpen) return;
    
    const currentHeight = window.innerHeight;
    const heightDiff = initialViewportHeight - currentHeight;
    
    // If keyboard is likely open (significant height reduction on mobile)
    if (heightDiff > 150 && window.innerWidth <= 768) {
      chatWindow.style.height = '400px';
      chatWindow.style.bottom = '10px';
    } else {
      chatWindow.style.height = '520px';
      chatWindow.style.bottom = 'calc(100% + 20px)';
    }
  };

  // Initialize widget
  const initWidget = async function() {
    // Check if widget already exists
    if (document.getElementById('voxtro-widget')) {
      console.log('Voxtro widget already exists, skipping initialization');
      return;
    }
    
    // If we have a visitor ID but no messages (page reload case), clear backend conversation
    if (visitorId && messages.length === 0) {
      try {
        await fetch(API_BASE + '/detect-conversation-end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatbotId: CHATBOT_ID,
            visitorId: visitorId,
            forceEnd: true
          })
        });
        console.log('Cleared backend conversation state on page reload');
      } catch (error) {
        console.error('Error clearing conversation state on page reload:', error);
      }
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'voxtro-overlay';
    overlay.style.cssText = '' +
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'width: 100%;' +
      'height: 100%;' +
      'background-color: rgba(0, 0, 0, 0.5);' +
      'opacity: 1;' +
      'z-index: 999998;' +
      'display: none;' +
      'pointer-events: auto;';
    overlay.onclick = hideChat;
    document.body.appendChild(overlay);
    
    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = createWidgetHTML();
    document.body.appendChild(widgetContainer);
    
    // Add pulse animation CSS and custom CSS
    const style = document.createElement('style');
    let customCSS = WIDGET_CUSTOM_CSS || '';
    
    // Clean up invalid CSS syntax that breaks the widget
    customCSS = customCSS.replace(/},\\s*$/g, '}'); // Remove trailing commas
    customCSS = customCSS.replace(/},(\\s*#)/g, '} $1'); // Fix commas between rules
    customCSS = customCSS.replace(/#voxtro-messages\\s*{[^}]*text-align[^}]*}/gi, ''); // Remove text-align on container
    
    style.textContent = 
      '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }' +
      '@keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } 60% { transform: translateY(-4px); } }' +
      '@keyframes widget-bounce { 0%, 100% { transform: translateY(0); } 10% { transform: translateY(-10px); } 20% { transform: translateY(0); } 30% { transform: translateY(-5px); } 40%, 100% { transform: translateY(0); } }' +
      '#voxtro-button { animation: widget-bounce 3s ease-in-out infinite; }' +
      '#voxtro-button:hover { animation: none; }' +
      '#voxtro-button.chat-open { animation: none; }' +
      // Override any custom CSS that might interfere with positioning
      '#voxtro-messages > div { display: flex !important; }' +
      '#voxtro-messages > div[style*="justify-content: flex-end"] { justify-content: flex-end !important; margin-left: auto !important; }' +
      '#voxtro-messages > div[style*="justify-content: flex-start"] { justify-content: flex-start !important; }' +
      '#voxtro-messages div[style*="background:"] { text-align: left !important; }' +
      customCSS;
    document.head.appendChild(style);
    
    // Prevent scroll events from bubbling to parent page when chat is open
    const chatWindow = document.getElementById('voxtro-chat');
    const messagesContainer = document.getElementById('voxtro-messages');
    
    if (chatWindow && messagesContainer) {
      // Prevent scroll on chat window
      chatWindow.addEventListener('wheel', function(e) {
        e.stopPropagation();
      }, { passive: true });
      
      // Handle scroll within messages container
      messagesContainer.addEventListener('wheel', function(e) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isScrollingUp = e.deltaY < 0;
        const isScrollingDown = e.deltaY > 0;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight;
        
        // Only prevent default if we can scroll within the container
        if ((isScrollingUp && !isAtTop) || (isScrollingDown && !isAtBottom)) {
          e.preventDefault();
          e.stopPropagation();
          messagesContainer.scrollTop += e.deltaY * 0.5;
        } else {
          // If we can't scroll within container, prevent all scrolling
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }
    
    // Add mobile keyboard listener
    window.addEventListener('resize', handleMobileKeyboard);
    
    // Initialize form buttons visibility
    const formButtons = document.getElementById('voxtro-form-buttons');
    if (formButtons && WIDGET_FORM_BUTTONS.length > 0) {
      formButtons.style.opacity = '1';
      // Handle different positions for transform
      if (WIDGET_POSITION === 'bottom-center' || WIDGET_POSITION === 'top-center') {
        formButtons.style.transform = 'translateX(-50%) scale(1)';
      } else {
        formButtons.style.transform = 'scale(1)';
      }
      formButtons.style.pointerEvents = 'auto';
    }
    
    console.log('Voxtro chat widget initialized successfully');
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();`;

    // Add aggressive cache-busting to force fresh script loads
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const cacheBreaker = `${timestamp}_${randomId}`;
    const buildStamp = new Date().toISOString();
    
    // Validate widget script for any remaining template literals
    if (widgetScript.includes('${WIDGET_POSITION') || widgetScript.includes('${positionStyles')) {
      throw new Error('CRITICAL: Found unescaped template literals in widget script - WIDGET_POSITION or positionStyles references detected');
    }
    
    const scriptWithCacheBuster = `console.log("Widget BUILD: ${buildStamp} - Cache Breaker: ${cacheBreaker}");
// ===== WIDGET SCRIPT - NO WIDGET_POSITION REFERENCES =====
// Generated: ${buildStamp}
// Cache Breaker: ${cacheBreaker}
${widgetScript}
// ===== END WIDGET SCRIPT =====
`;
    
    return new Response(scriptWithCacheBuster, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'ETag': `"${Math.random().toString(36).substr(2, 15)}"`,
        'Last-Modified': new Date().toUTCString(),
        'Vary': 'Origin, Accept-Encoding'
      },
    });

  } catch (error) {
    console.error('Error in widget function:', error);
    return new Response(
      'console.error(\'Widget error: ' + error.message + '\');',
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
      }
    );
  }
});