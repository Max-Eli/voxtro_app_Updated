import { useState, useEffect, useRef } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Bot, Sparkles, Mail, Phone, Building2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  // AI Summary fields
  summary?: string;
  key_points?: string[];
  action_items?: string[];
  sentiment?: string;
  sentiment_notes?: string;
  conversation_outcome?: string;
  topics_discussed?: string[];
  lead_info?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    interest_level?: string;
    notes?: string;
  };
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

    // First fetch the conversation with summary data
    const { data: conversationData, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        chatbot_id,
        summary,
        key_points,
        action_items,
        sentiment,
        sentiment_notes,
        conversation_outcome,
        topics_discussed,
        lead_info,
        chatbots!inner(
          name
        )
      `)
      .eq('id', conversationId)
      .in('chatbot_id', chatbotIds)
      .single();

    if (convError || !conversationData) {
      console.error('Error fetching conversation:', convError);
      toast.error("Failed to fetch conversation");
      setLoading(false);
      return;
    }

    // Fetch messages for the conversation
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        role,
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      toast.error("Failed to fetch messages");
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
    }

    setConversationInfo({
      id: conversationId,
      chatbot_name: conversationData.chatbots.name,
      created_at: conversationData.created_at,
      summary: conversationData.summary,
      key_points: conversationData.key_points,
      action_items: conversationData.action_items,
      sentiment: conversationData.sentiment,
      sentiment_notes: conversationData.sentiment_notes,
      conversation_outcome: conversationData.conversation_outcome,
      topics_discussed: conversationData.topics_discussed,
      lead_info: conversationData.lead_info
    });
    
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

      {/* AI Insights - Key Details & Lead Info */}
      {((conversationInfo.key_points && conversationInfo.key_points.length > 0) ||
        (conversationInfo.lead_info && (conversationInfo.lead_info.name || conversationInfo.lead_info.email || conversationInfo.lead_info.phone))) && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">AI Insights</span>
            </div>
          </div>

          <div className="p-3 space-y-3">
            {/* Key Details */}
            {conversationInfo.key_points && conversationInfo.key_points.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Details</p>
                <ul className="text-sm space-y-1">
                  {conversationInfo.key_points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lead Information */}
            {conversationInfo.lead_info && (conversationInfo.lead_info.name || conversationInfo.lead_info.email || conversationInfo.lead_info.phone) && (
              <div className="p-2.5 border rounded-md bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Lead Information</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {conversationInfo.lead_info.name && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>{conversationInfo.lead_info.name}</span>
                    </div>
                  )}
                  {conversationInfo.lead_info.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{conversationInfo.lead_info.email}</span>
                    </div>
                  )}
                  {conversationInfo.lead_info.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>{conversationInfo.lead_info.phone}</span>
                    </div>
                  )}
                  {conversationInfo.lead_info.company && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>{conversationInfo.lead_info.company}</span>
                    </div>
                  )}
                  {conversationInfo.lead_info.interest_level && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span>Interest: </span>
                      <Badge variant="outline" className="text-xs py-0">
                        {conversationInfo.lead_info.interest_level}
                      </Badge>
                    </div>
                  )}
                </div>
                {conversationInfo.lead_info.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{conversationInfo.lead_info.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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