import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface ConversationsListProps {
  onConversationSelect: (conversationId: string) => void;
  chatbotId?: string; // Optional: filter to specific chatbot
  hideFilter?: boolean; // Optional: hide the chatbot filter dropdown
}

const ConversationsList = ({ onConversationSelect, chatbotId, hideFilter = false }: ConversationsListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<string>(chatbotId || "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchChatbots = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chatbots')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch chatbots",
        variant: "destructive",
      });
      return;
    }

    setChatbots(data || []);
  };

  const fetchConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    
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
            name,
            user_id
          )
        )
      `)
      .eq('conversations.chatbots.user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply chatbot filter
    if (selectedChatbot !== 'all') {
      query = query.eq('conversations.chatbot_id', selectedChatbot);
    }

    const { data: messagesData, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch conversations",
        variant: "destructive",
      });
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
    if (!hideFilter) {
      fetchChatbots();
    }
  }, [user, hideFilter]);

  useEffect(() => {
    // If chatbotId prop changes, update selectedChatbot
    if (chatbotId) {
      setSelectedChatbot(chatbotId);
    }
  }, [chatbotId]);

  useEffect(() => {
    fetchConversations();
  }, [user, selectedChatbot, searchTerm]);

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

  if (!user) {
    return <div>Please log in to view conversations.</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-background">
        <div className="flex gap-4">
          {!hideFilter && (
            <Select value={selectedChatbot} onValueChange={setSelectedChatbot}>
              <SelectTrigger className="w-[200px]">
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
          )}

          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading conversations...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No conversations found.
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.id} 
                className="mb-2 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onConversationSelect(conversation.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{conversation.chatbot_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {conversation.message_count} messages
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        <span className="font-medium">
                          {conversation.last_sender === 'user' ? 'User: ' : 'Bot: '}
                        </span>
                        {truncateText(conversation.last_message)}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                      {formatTimestamp(conversation.last_message_time)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsList;