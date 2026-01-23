import { useState, useEffect, useRef } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, User, Bot, Sparkles, CheckCircle, AlertCircle, Target } from "lucide-react";
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

      {/* AI Summary Section */}
      {conversationInfo.summary && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">AI Analysis</h3>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">{conversationInfo.summary}</p>
          </div>

          {/* Sentiment & Outcome */}
          <div className="flex flex-wrap gap-2">
            {conversationInfo.sentiment && (
              <Badge variant={
                conversationInfo.sentiment === 'positive' ? 'default' :
                conversationInfo.sentiment === 'negative' ? 'destructive' : 'secondary'
              }>
                {conversationInfo.sentiment === 'positive' && <CheckCircle className="h-3 w-3 mr-1" />}
                {conversationInfo.sentiment === 'negative' && <AlertCircle className="h-3 w-3 mr-1" />}
                {conversationInfo.sentiment.charAt(0).toUpperCase() + conversationInfo.sentiment.slice(1)} Sentiment
              </Badge>
            )}
            {conversationInfo.conversation_outcome && (
              <Badge variant="outline">
                <Target className="h-3 w-3 mr-1" />
                {conversationInfo.conversation_outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            )}
          </div>

          {/* Sentiment Notes */}
          {conversationInfo.sentiment_notes && (
            <p className="text-sm text-muted-foreground italic">
              {conversationInfo.sentiment_notes}
            </p>
          )}

          {/* Key Points */}
          {conversationInfo.key_points && conversationInfo.key_points.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                Key Points
              </h4>
              <ul className="space-y-1 text-sm">
                {conversationInfo.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {conversationInfo.action_items && conversationInfo.action_items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Action Items
              </h4>
              <ul className="space-y-1 text-sm">
                {conversationInfo.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Topics Discussed */}
          {conversationInfo.topics_discussed && conversationInfo.topics_discussed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Topics Discussed</h4>
              <div className="flex flex-wrap gap-1">
                {conversationInfo.topics_discussed.map((topic, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Lead Info */}
          {conversationInfo.lead_info && (conversationInfo.lead_info.name || conversationInfo.lead_info.email || conversationInfo.lead_info.phone) && (
            <div className="space-y-2 p-3 border rounded-lg">
              <h4 className="text-sm font-medium">Lead Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {conversationInfo.lead_info.name && (
                  <div>
                    <span className="text-muted-foreground">Name:</span> {conversationInfo.lead_info.name}
                  </div>
                )}
                {conversationInfo.lead_info.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span> {conversationInfo.lead_info.email}
                  </div>
                )}
                {conversationInfo.lead_info.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span> {conversationInfo.lead_info.phone}
                  </div>
                )}
                {conversationInfo.lead_info.company && (
                  <div>
                    <span className="text-muted-foreground">Company:</span> {conversationInfo.lead_info.company}
                  </div>
                )}
                {conversationInfo.lead_info.interest_level && (
                  <div>
                    <span className="text-muted-foreground">Interest:</span>{' '}
                    <Badge variant="outline" className="text-xs">
                      {conversationInfo.lead_info.interest_level}
                    </Badge>
                  </div>
                )}
              </div>
              {conversationInfo.lead_info.notes && (
                <p className="text-sm text-muted-foreground mt-2">{conversationInfo.lead_info.notes}</p>
              )}
            </div>
          )}
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