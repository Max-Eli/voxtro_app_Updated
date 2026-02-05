import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, User, Bot } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface ConversationDetailProps {
  conversationId: string;
  onBack: () => void;
}

const ConversationDetail = ({ conversationId, onBack }: ConversationDetailProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversationDetail = async () => {
    if (!user || !conversationId) return;
    
    setLoading(true);
    
    // Fetch messages
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
          chatbots!inner(
            name,
            user_id
          )
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching conversation:', messagesError);
      toast({
        title: "Error",
        description: "Failed to fetch conversation",
        variant: "destructive",
      });
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
  }, [conversationId, user]);

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
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading conversation...</div>
      </div>
    );
  }

  if (!conversationInfo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{conversationInfo.chatbot_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatConversationDate(conversationInfo.created_at)} • {messages.length} messages
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  {formatMessageTime(message.created_at)}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
    </div>
  );
};

export default ConversationDetail;