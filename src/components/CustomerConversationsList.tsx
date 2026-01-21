import { useState, useEffect } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ConversationSummary {
  id: string;
  chatbot_name: string;
  chatbot_id: string;
  last_message: string;
  last_message_time: string;
  message_count: number;
  last_sender: string;
}

interface Chatbot {
  id: string;
  name: string;
}

interface CustomerConversationsListProps {
  onConversationSelect: (conversationId: string) => void;
}

const CustomerConversationsList = ({ onConversationSelect }: CustomerConversationsListProps) => {
  const { customer } = useCustomerAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchChatbots = async () => {
    if (!customer) return;

    // Get chatbots assigned to this customer
    const { data: assignments, error } = await supabase
      .from('customer_chatbot_assignments')
      .select(`
        chatbot_id,
        chatbots (
          id,
          name
        )
      `)
      .eq('customer_id', customer.id);

    if (error) {
      toast.error("Failed to fetch chatbots");
      return;
    }

    const chatbotData = assignments?.map(a => ({
      id: a.chatbots.id,
      name: a.chatbots.name
    })) || [];

    setChatbots(chatbotData);
  };

  const fetchConversations = async () => {
    if (!customer) return;
    
    setLoading(true);
    
    // Get assigned chatbot IDs
    const { data: assignments } = await supabase
      .from('customer_chatbot_assignments')
      .select('chatbot_id')
      .eq('customer_id', customer.id);

    const chatbotIds = assignments?.map(a => a.chatbot_id) || [];
    
    if (chatbotIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('messages')
      .select(`
        conversation_id,
        content,
        role,
        created_at,
        conversations!inner(
          id,
          chatbot_id,
          chatbots!inner(
            id,
            name
          )
        )
      `)
      .in('conversations.chatbot_id', chatbotIds)
      .order('created_at', { ascending: false });

    // Apply chatbot filter
    if (selectedChatbot !== 'all') {
      query = query.eq('conversations.chatbot_id', selectedChatbot);
    }

    const { data: messagesData, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      toast.error("Failed to fetch conversations");
      setLoading(false);
      return;
    }

    // Group messages by conversation
    const conversationMap = new Map<string, {
      messages: any[];
      chatbot_name: string;
      chatbot_id: string;
    }>();
    
    messagesData?.forEach(message => {
      const convId = message.conversation_id;
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          messages: [],
          chatbot_name: message.conversations.chatbots.name,
          chatbot_id: message.conversations.chatbot_id
        });
      }
      conversationMap.get(convId)!.messages.push(message);
    });

    // Create conversation summaries
    const conversationSummaries: ConversationSummary[] = [];
    
    conversationMap.forEach((convData, convId) => {
      const messages = convData.messages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      if (messages.length > 0) {
        const lastMessage = messages[0];
        const summary: ConversationSummary = {
          id: convId,
          chatbot_name: convData.chatbot_name,
          chatbot_id: convData.chatbot_id,
          last_message: lastMessage.content,
          last_message_time: lastMessage.created_at,
          message_count: messages.length,
          last_sender: lastMessage.role
        };
        
        // Apply search filter
        if (!searchTerm || 
            summary.last_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            summary.chatbot_name.toLowerCase().includes(searchTerm.toLowerCase())) {
          conversationSummaries.push(summary);
        }
      }
    });

    // Sort by most recent first
    conversationSummaries.sort((a, b) => 
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );
    
    setConversations(conversationSummaries);
    setLoading(false);
  };

  useEffect(() => {
    fetchChatbots();
  }, [customer]);

  useEffect(() => {
    fetchConversations();
  }, [customer, selectedChatbot, searchTerm]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-4">
      {!customer ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please log in to view conversations.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by chatbot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chatbots</SelectItem>
                  {chatbots.map((chatbot) => (
                    <SelectItem key={chatbot.id} value={chatbot.id}>
                      {chatbot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="max-h-[600px] overflow-y-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No conversations found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary"
                    onClick={() => onConversationSelect(conversation.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                              <h4 className="font-semibold text-sm truncate">{conversation.chatbot_name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {conversation.last_sender === 'user' ? '👤 ' : '🤖 '}
                              {truncateText(conversation.last_message, 100)}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(conversation.last_message_time)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            <MessageSquare className="h-3 w-3" />
                            {conversation.message_count}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerConversationsList;