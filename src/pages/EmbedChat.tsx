import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Minimize2, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import chimeAlert from '@/assets/chime-alert.wav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Chatbot {
  id: string;
  name: string;
  theme_color: string;
  is_active: boolean;
  end_chat_notification_email?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer?: string;
  is_active: boolean;
}

export default function EmbedChat() {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null);
  const [visitorId] = useState(() => 
    localStorage.getItem('voxtro_visitor_id') || 
    (() => {
      const id = `visitor_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('voxtro_visitor_id', id);
      return id;
    })()
  );
  const audioRef = useState(() => new Audio(chimeAlert))[0];

  // Initialize audio on mount
  useEffect(() => {
    audioRef.volume = 0.5;
  }, []);

  const playNotificationSound = () => {
    try {
      audioRef.currentTime = 0;
      audioRef.play().catch(err => {
        console.log('⚠️ EmbedChat - Sound blocked by browser:', err.message);
      });
    } catch (error) {
      console.error('❌ EmbedChat - Error playing audio:', error);
    }
  };

  useEffect(() => {
    // Prevent scroll bubbling on the chat container
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };

    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.addEventListener('wheel', handleWheel);
      return () => chatContainer.removeEventListener('wheel', handleWheel);
    }
  }, []);

  useEffect(() => {
    if (chatbotId) {
      fetchChatbot();
      fetchFAQs();
    }
  }, [chatbotId]);

  const fetchFAQs = async () => {
    if (!chatbotId) return;
    
    try {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .select('id, question, answer, is_active')
        .eq('chatbot_id', chatbotId)
        .eq('is_active', true)
        .order('sort_order')
        .limit(4); // Limit to 4 suggestions

      if (!error && data) {
        setFaqs(data);
      }
    } catch (error) {
      console.log('No FAQs configured for this chatbot');
    }
  };

  const fetchChatbot = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbots')
        .select('id, name, theme_color, is_active, end_chat_notification_email')
        .eq('id', chatbotId)
        .single();

      if (error || !data) {
        throw new Error('Chatbot not found');
      }

      setChatbot(data);
      
      // Add welcome message
      setMessages([{
        role: 'assistant',
        content: `Hi! I'm ${data.name}. How can I help you today?${!data.is_active ? ' (Preview Mode)' : ''}`,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load chatbot',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !chatbot) return;

    // Hide suggestions when first message is sent
    setShowSuggestions(false);

    // If chatbot is inactive, show preview mode message
    if (!chatbot.is_active) {
      const userMessage: Message = {
        role: 'user',
        content: input.trim(),
        timestamp: new Date()
      };

      const previewMessage: Message = {
        role: 'assistant',
        content: "This is preview mode. The chatbot will respond with actual AI when it's active and embedded on your website.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, previewMessage]);
      setInput('');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('chat', {
        body: {
          chatbotId: chatbot.id,
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          visitorId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      console.log('🔊 Calling playNotificationSound now...');
      playNotificationSound();
      console.log('✓ playNotificationSound called');
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const testNotificationEmail = async () => {
    if (!chatbot?.id) return;
    
    try {
      // Check if the chatbot has end-of-chat notification email configured
      if (!chatbot.end_chat_notification_email) {
        throw new Error('Please configure an end-of-chat notification email for this chatbot first');
      }

      // Use basic email function to send test email
      const { data, error } = await supabase.functions.invoke('basic-email', {
        body: {
          email: chatbot.end_chat_notification_email,
          testMessage: `Test email for chatbot "${chatbot.name}" - End-of-chat notifications are working correctly!`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Test Email Sent!',
        description: `Check your inbox at ${chatbot.end_chat_notification_email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  if (!chatbotId) {
    return <Navigate to="/" replace />;
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading chatbot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-0 md:p-4">
      <Card className="chat-container w-full h-screen md:max-w-md md:h-[600px] flex flex-col overflow-hidden border-0 shadow-xl rounded-none md:rounded-2xl">
        {/* Header - Customizable color bar with logo and name */}
        <CardHeader 
          className="text-white p-4 border-0"
          style={{ backgroundColor: chatbot.theme_color }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">{chatbot.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">{chatbot.name}</h3>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={testNotificationEmail}
                className="text-white hover:bg-white/10"
              >
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 bg-white overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100% - 120px)' }}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold text-xs">{chatbot.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-md text-sm text-gray-800 leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                )}
                {message.role === 'user' && (
                  <div
                    className="max-w-[85%] p-4 rounded-2xl rounded-tr-md text-sm text-white leading-relaxed"
                    style={{ backgroundColor: chatbot.theme_color }}
                  >
                    {message.content}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-xs">{chatbot.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-md text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Auto-scroll anchor */}
            <div ref={setMessagesEndRef} />
          </div>

          {/* Suggested Questions - Show FAQs if configured */}
          {showSuggestions && faqs.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex flex-col items-end space-y-2">
                {faqs.map((faq) => (
                  <button 
                    key={faq.id}
                    className="text-left p-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 rounded-full text-sm text-gray-700 border border-gray-200 max-w-xs"
                    onClick={() => {
                      setInput(faq.question);
                      setShowSuggestions(false);
                    }}
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Powered by Footer */}
          <div className="px-4 pb-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <img 
                  src="https://ik.imagekit.io/wrewtbha2/voxtrofavicon.png?updatedAt=1752758574810" 
                  alt="Voxtro" 
                  className="w-4 h-4 object-contain"
                />
                <span>Powered by Voxtro</span>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="p-4">
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message..."
                  disabled={loading}
                  className="border-0 bg-white rounded-full px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:ring-2 focus:ring-blue-500 focus:shadow-md transition-all"
                  style={{ color: '#111827' }}
                />
              </div>
              <Button 
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                size="sm"
                className="w-10 h-10 p-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}