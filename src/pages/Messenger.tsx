import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bot } from 'lucide-react';
import { ChatForm } from '@/components/ChatForm';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import chimeAlert from '@/assets/chime-alert.wav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  formData?: any;
}

interface Chatbot {
  id: string;
  name: string;
  theme_color: string;
  welcome_message: string;
}

interface FAQ {
  question: string;
  answer: string;
}

export default function Messenger() {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const audioRef = useState(() => new Audio(chimeAlert))[0];

  const visitorId = `visitor_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

  // Initialize audio on mount
  useEffect(() => {
    audioRef.volume = 0.5;
  }, []);

  const playNotificationSound = () => {
    try {
      audioRef.currentTime = 0;
      audioRef.play().catch(err => {
        console.log('⚠️ Messenger - Sound blocked by browser:', err.message);
      });
    } catch (error) {
      console.error('❌ Messenger - Error playing audio:', error);
    }
  };

  useEffect(() => {
    const fetchChatbotData = async () => {
      if (!chatbotId) return;

      try {
        // Fetch chatbot data - allow inactive for authenticated users
        const { data: chatbotData, error: chatbotError } = await supabase
          .from('chatbots')
          .select('id, name, theme_color, welcome_message, is_active, user_id')
          .eq('id', chatbotId)
          .single();

        if (chatbotError || !chatbotData) {
          console.error('Chatbot not found');
          return;
        }

        // For inactive chatbots, check if current user is the owner
        if (!chatbotData.is_active) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || user.id !== chatbotData.user_id) {
            console.error('Chatbot is inactive and user is not the owner');
            return;
          }
        }

        setChatbot(chatbotData);

        // Fetch FAQs
        const { data: faqsData, error: faqsError } = await supabase
          .from('chatbot_faqs')
          .select('question, answer')
          .eq('chatbot_id', chatbotId)
          .eq('is_active', true)
          .order('sort_order');

        if (!faqsError && faqsData) {
          setFaqs(faqsData);
        }

        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: chatbotData.welcome_message || 'Hi! How can I help you today?'
        }]);

      } catch (error) {
        console.error('Error fetching chatbot data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatbotData();
  }, [chatbotId]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || !chatbot) return;

    // Add user message
    const newUserMessage = { role: 'user' as const, content: message };
    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Build messages array for the API call
      const allMessages = [...messages, newUserMessage];

      const response = await supabase.functions.invoke('chat', {
        body: {
          chatbotId: chatbot.id,
          messages: allMessages,
          conversationId: conversationId,
          visitorId: visitorId
        }
      });

      if (response.data?.conversationId && !conversationId) {
        setConversationId(response.data.conversationId);
      }

      const botResponse = response.data?.response || 'Sorry, I encountered an error. Please try again.';
      const formData = response.data?.formData;
      
      console.log('📨 Bot response received, about to play sound');
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: botResponse,
        formData: formData 
      }]);
      
      console.log('🔊 Calling playNotificationSound now...');
      playNotificationSound();
      console.log('✓ playNotificationSound called');

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage(inputMessage);
    }
  };

  const handleFAQClick = (question: string) => {
    sendMessage(question);
  };

  const handleFormSubmit = async (formId: string, formData: Record<string, any>) => {
    if (!chatbot) return;
    
    setIsSubmittingForm(true);
    
    try {
      const response = await supabase.functions.invoke('form-submit', {
        body: {
          formId: formId,
          submittedData: formData,
          conversationId: conversationId,
          visitorId: visitorId
        }
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to submit form');
      }

      // Add success message to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.message || 'Thank you for submitting the form!'
      }]);

      toast.success('Form submitted successfully!');

    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form. Please try again.');
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error submitting your form. Please try again.'
      }]);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading messenger...</p>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Chatbot Not Found</h1>
          <p className="text-muted-foreground">The chatbot you're looking for doesn't exist or is inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="max-w-4xl mx-auto flex flex-col h-screen bg-white shadow-2xl">
        {/* Header */}
        <div 
          className="px-6 py-8 text-white text-center shadow-lg"
          style={{ backgroundColor: chatbot.theme_color }}
        >
          <h1 className="text-3xl font-bold mb-2">{chatbot.name}</h1>
          <p className="opacity-90">How can I help you today?</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  style={{
                    backgroundColor: message.role === 'user' ? chatbot.theme_color : undefined
                  }}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-gray-900">
                      <ReactMarkdown 
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({children}) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>
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
                <div className="flex justify-center mt-4">
                  <ChatForm
                    formData={message.formData}
                    onSubmit={(data) => handleFormSubmit(message.formData.id, data)}
                    isSubmitting={isSubmittingForm}
                    themeColor={chatbot.theme_color}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <p className="text-sm font-semibold text-gray-700 mb-3">Quick Questions:</p>
            <div className="flex flex-wrap gap-2">
              {faqs.map((faq, index) => (
                <button
                  key={index}
                  onClick={() => handleFAQClick(faq.question)}
                  className="px-3 py-2 text-sm rounded-full border-2 transition-all hover:scale-105"
                  style={{
                    borderColor: `${chatbot.theme_color}30`,
                    backgroundColor: `${chatbot.theme_color}15`,
                    color: chatbot.theme_color
                  }}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t bg-white">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-full focus:outline-none focus:border-primary text-gray-900"
              disabled={isTyping}
            />
            <button
              onClick={() => sendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isTyping}
              className="px-6 py-3 rounded-full text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
              style={{ backgroundColor: chatbot.theme_color }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}