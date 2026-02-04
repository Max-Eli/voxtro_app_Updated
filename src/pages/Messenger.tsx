import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, Send, X, User, Loader2 } from 'lucide-react';
import { ChatForm } from '@/components/ChatForm';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// Widget API base URL - use environment variable with fallback (strip trailing slash)
const WIDGET_API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.voxtro.io').replace(/\/$/, '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  formData?: any;
}

interface WidgetConfig {
  chatbot_id: string;
  name: string;
  theme_color?: string;
  welcome_message?: string;
  first_message?: string;
  avatar_url?: string;
  position?: string;
  faqs?: Array<{ question: string; answer: string }>;
  // Extended config from backend
  theme?: {
    primary_color?: string;
    color_type?: string;
    gradient_end?: string;
    gradient_angle?: number;
  };
  primary_color?: string;
  widget_button_color?: string;
  widget_button_text?: string;
}

export default function Messenger() {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [isEndingConversation, setIsEndingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get or create visitor_id from localStorage for session persistence
  const getVisitorId = (): string => {
    const storageKey = `voxtro_visitor_${chatbotId}`;
    let visitorId = localStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = `visitor_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      localStorage.setItem(storageKey, visitorId);
    }
    return visitorId;
  };

  // Get stored conversation_id from localStorage
  const getStoredConversationId = (): string | null => {
    const storageKey = `voxtro_conversation_${chatbotId}`;
    return localStorage.getItem(storageKey);
  };

  // Store conversation_id in localStorage
  const storeConversationId = (convId: string) => {
    const storageKey = `voxtro_conversation_${chatbotId}`;
    localStorage.setItem(storageKey, convId);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input after bot finishes typing
  useEffect(() => {
    if (!isTyping && showInput) {
      inputRef.current?.focus();
    }
  }, [isTyping, showInput]);

  // Fetch widget config from backend API
  useEffect(() => {
    const fetchWidgetConfig = async () => {
      if (!chatbotId) {
        setError('No chatbot ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${WIDGET_API_BASE}/api/widget/${chatbotId}/config`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Chatbot not found');
          } else {
            setError('Failed to load chatbot configuration');
          }
          setIsLoading(false);
          return;
        }

        const configData: WidgetConfig = await response.json();
        setConfig(configData);

        // Restore conversation_id if exists
        const storedConvId = getStoredConversationId();
        if (storedConvId) {
          setConversationId(storedConvId);
        }

        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: configData.welcome_message || 'Hi! How can I help you today?'
        }]);

      } catch (err) {
        console.error('Error fetching widget config:', err);
        setError('Failed to connect to chatbot service');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWidgetConfig();
  }, [chatbotId]);

  // Send message to backend widget API
  const sendMessage = async (message: string) => {
    if (!message.trim() || !config) return;

    const visitorId = getVisitorId();

    // Add user message immediately
    const newUserMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${WIDGET_API_BASE}/api/widget/${chatbotId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitor_id: visitorId,
          message: message,
          conversation_id: conversationId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Store conversation_id from first response
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
        storeConversationId(data.conversation_id);
      }

      const botResponse = data.message || 'Sorry, I encountered an error. Please try again.';
      const formData = data.form_data;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: botResponse,
        formData: formData 
      }]);

    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const handleFAQClick = (question: string) => {
    sendMessage(question);
    setShowInput(true);
  };

  // Handle form submission through widget API
  const handleFormSubmit = async (formId: string, formData: Record<string, any>) => {
    if (!config) return;
    
    setIsSubmittingForm(true);
    const visitorId = getVisitorId();

    try {
      const response = await fetch(`${WIDGET_API_BASE}/api/widget/${chatbotId}/form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_id: formId,
          submitted_data: formData,
          conversation_id: conversationId,
          visitor_id: visitorId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || 'Thank you for submitting the form!'
      }]);

      toast.success('Form submitted successfully!');

    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error('Failed to submit form. Please try again.');
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error submitting your form. Please try again.'
      }]);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // End conversation and generate AI summary
  const endConversation = async (convId: string) => {
    try {
      await fetch(`${WIDGET_API_BASE}/api/chat/conversations/${convId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error('Error ending conversation:', err);
    }
  };

  // Start a new conversation
  const handleNewConversation = async () => {
    // End current conversation to trigger AI summary generation
    if (conversationId) {
      setIsEndingConversation(true);
      await endConversation(conversationId);
    }

    const storageKey = `voxtro_conversation_${chatbotId}`;
    localStorage.removeItem(storageKey);
    setConversationId(null);
    setMessages([{
      role: 'assistant',
      content: config?.welcome_message || 'Hi! How can I help you today?'
    }]);
    setShowInput(false);
    setIsEndingConversation(false);
  };

  // End conversation when component unmounts or page closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (conversationId) {
        // Use sendBeacon for reliable delivery on page close
        navigator.sendBeacon(
          `${WIDGET_API_BASE}/api/chat/conversations/${conversationId}/end`,
          JSON.stringify({})
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also end conversation on unmount
      if (conversationId) {
        endConversation(conversationId);
      }
    };
  }, [conversationId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !config) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            {error || 'Unable to load chatbot'}
          </h1>
          <p className="text-sm text-gray-500">
            Please check the chatbot ID and try again.
          </p>
        </div>
      </div>
    );
  }

  // Use theme.primary_color for chat interface, fallback to theme_color
  const themeColor = (config.theme && config.theme.primary_color) || config.theme_color || '#3B82F6';
  // Use widget_button_color for widget button, fallback to theme.secondary_color
  const buttonColor = config.widget_button_color || (config.theme && config.theme.secondary_color) || '#6366F1';
  const buttonText = config.widget_button_text || '';
  const faqs = config.faqs || [];

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div 
        className="flex-shrink-0 px-4 py-3 text-white shadow-md flex items-center gap-3"
        style={{ backgroundColor: themeColor }}
      >
        {config.avatar_url ? (
          <img 
            src={config.avatar_url} 
            alt={config.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate">{config.name}</h1>
          <p className="text-xs opacity-80">Online</p>
        </div>
        {conversationId && !isEndingConversation && (
          <button
            onClick={handleNewConversation}
            className="px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors text-xs font-medium bg-white/10 flex items-center gap-1"
            title="End conversation"
          >
            <X className="w-3 h-3" />
            End Chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={index}>
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                  message.role === 'user'
                    ? 'text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
                style={{
                  backgroundColor: message.role === 'user' ? themeColor : undefined
                }}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown 
                      components={{
                        p: ({children}) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>,
                        li: ({children}) => <li className="text-sm">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                        a: ({href, children}) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {children}
                          </a>
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
            
            {/* Render form if present */}
            {message.formData && (
              <div className="flex justify-center mt-3">
                <ChatForm
                  formData={message.formData}
                  onSubmit={(data) => handleFormSubmit(message.formData.id, data)}
                  isSubmitting={isSubmittingForm}
                  themeColor={themeColor}
                />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* FAQ Suggestions - when FAQs exist */}
      {faqs.length > 0 && messages.length <= 1 && !showInput && (
        <div className="flex-shrink-0 px-4 py-6 border-t bg-white/90 shadow-sm rounded-b-xl">
          <div className="max-w-sm mx-auto">
            <div className="flex flex-wrap gap-2 mb-5 justify-end">
              {faqs.slice(0, 4).map((faq, index) => (
                <button
                  key={index}
                  onClick={() => handleFAQClick(faq.question)}
                  className="text-right px-4 py-2 rounded-xl bg-white border text-gray-700 text-sm shadow-sm hover:shadow transition-all"
                  style={{
                    borderColor: `${themeColor}20`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = themeColor;
                    e.currentTarget.style.color = themeColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${themeColor}20`;
                    e.currentTarget.style.color = '#374151';
                  }}
                >
                  {faq.question}
                </button>
              ))}
            </div>
            {buttonText.trim() ? (
              <button
                className="w-full py-3 rounded-full text-white font-semibold text-base shadow-lg transition-all hover:opacity-90"
                style={{ backgroundColor: buttonColor }}
                onClick={() => setShowInput(true)}
              >
                {buttonText}
              </button>
            ) : (
              <button
                className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:opacity-90"
                style={{ backgroundColor: buttonColor }}
                onClick={() => setShowInput(true)}
                aria-label="Open chat"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat with us button - when NO FAQs exist */}
      {faqs.length === 0 && messages.length <= 1 && !showInput && (
        <div className="flex-shrink-0 px-4 py-6 border-t bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-sm mx-auto text-center">
            <p className="text-sm text-gray-600 mb-4">
              Have a question? We're here to help!
            </p>
            <button
              className="w-full py-3.5 rounded-full text-white font-semibold text-base shadow-lg transition-all hover:opacity-90 hover:shadow-xl active:scale-[0.98]"
              style={{ backgroundColor: themeColor }}
              onClick={() => setShowInput(true)}
            >
              {buttonText.trim() || 'Start a conversation'}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {showInput && (
        <div className="flex-shrink-0 p-3 border-t bg-white">
          {isEndingConversation ? (
            <div className="flex items-center justify-center gap-2 py-2.5">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-500">Ending conversation...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 text-base border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-0 text-gray-900 placeholder-gray-400"
                style={{
                  focusRing: themeColor,
                }}
                disabled={isTyping}
              />
              <button
                onClick={() => sendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isTyping}
                className="flex-shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
                style={{ backgroundColor: buttonColor }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-center text-[10px] text-gray-400 mt-2">
            Powered by Voxtro
          </p>
        </div>
      )}
    </div>
  );
}