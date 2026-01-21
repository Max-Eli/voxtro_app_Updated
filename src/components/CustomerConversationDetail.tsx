import { useState, useEffect, useRef } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, User, Bot } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

interface ConversationInfo {
  id: string;
  chatbot_name: string;
  created_at: string;
}

interface CustomerConversationDetailProps {
  conversationId: string;
  onBack: () => void;
}

const CustomerConversationDetail = ({ conversationId, onBack }: CustomerConversationDetailProps) => {
  const { customer } = useCustomerAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversationDetail = async () => {
    if (!customer || !conversationId) return;
    
    setLoading(true);
    
    // Get assigned chatbot IDs first
    const { data: assignments } = await supabase
      .from('customer_chatbot_assignments')
      .select('chatbot_id')
      .eq('customer_id', customer.id);

    const chatbotIds = assignments?.map(a => a.chatbot_id) || [];
    
    if (chatbotIds.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch messages for conversations from assigned chatbots
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        role,
        created_at,
        conversations!inner(
          id,
          created_at,
          chatbot_id,
          chatbots!inner(
            name
          )
        )
      `)
      .eq('conversation_id', conversationId)
      .in('conversations.chatbot_id', chatbotIds)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching conversation:', messagesError);
      toast.error("Failed to fetch conversation");
      setLoading(false);
      return;
    }

    if (messagesData && messagesData.length > 0) {
      setMessages(messagesData.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        created_at: msg.created_at
      })));

      setConversationInfo({
        id: conversationId,
        chatbot_name: messagesData[0].conversations.chatbots.name,
        created_at: messagesData[0].conversations.created_at
      });
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchConversationDetail();
  }, [conversationId, customer]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString([], { 
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatConversationDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (!conversationInfo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Conversation Info */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{conversationInfo.chatbot_name}</h3>
            <p className="text-sm text-muted-foreground">
              {formatConversationDate(conversationInfo.created_at)} • {messages.length} messages
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
            
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' 
                  ? 'text-primary-foreground/70' 
                  : 'text-muted-foreground'
              }`}>
                {formatMessageTime(message.created_at)}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default CustomerConversationDetail;