import { useState, useEffect } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import CustomerConversationsList from '@/components/CustomerConversationsList';
import CustomerConversationDetail from '@/components/CustomerConversationDetail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageSquare, TrendingUp, Bot, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyAgentState } from '@/components/customer/EmptyAgentState';

interface ChatbotStats {
  id: string;
  name: string;
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
}

export function CustomerConversationsPage() {
  const { customer } = useCustomerAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [chatbotStats, setChatbotStats] = useState<ChatbotStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchChatbotStats();
    }
  }, [customer]);

  const fetchChatbotStats = async () => {
    if (!customer) return;

    try {
      // Get assigned chatbots
      const { data: assignments, error: assignError } = await supabase
        .from('customer_chatbot_assignments')
        .select(`
          chatbot_id,
          chatbots (
            id,
            name
          )
        `)
        .eq('customer_id', customer.id);

      if (assignError) throw assignError;

      const chatbotIds = assignments?.map(a => a.chatbot_id) || [];

      if (chatbotIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get conversation and message stats for each chatbot
      const statsPromises = assignments.map(async (assignment) => {
        const chatbotId = assignment.chatbot_id;
        const chatbotName = assignment.chatbots.name;

        // Get total conversations
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('chatbot_id', chatbotId);

        const totalConversations = conversations?.length || 0;

        // Get total messages
        const { data: messages } = await supabase
          .from('messages')
          .select('id, conversation_id')
          .in('conversation_id', conversations?.map(c => c.id) || []);

        const totalMessages = messages?.length || 0;

        return {
          id: chatbotId,
          name: chatbotName,
          totalConversations,
          totalMessages,
          avgMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
        };
      });

      const stats = await Promise.all(statsPromises);
      setChatbotStats(stats);
    } catch (error) {
      console.error('Error fetching chatbot stats:', error);
      toast.error('Failed to load chatbot analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleCloseDetail = () => {
    setSelectedConversationId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground">
          View and manage all conversations from your chatbots
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading analytics...</div>
            </CardContent>
          </Card>
        ) : chatbotStats.length === 0 ? (
          <div className="col-span-full">
            <EmptyAgentState type="chatbot" />
          </div>
        ) : (
          chatbotStats.map((stat) => (
            <Card key={stat.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Conversations
                    </div>
                    <div className="text-2xl font-bold">{stat.totalConversations}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      Total Messages
                    </div>
                    <div className="text-lg font-semibold">{stat.totalMessages}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Avg per Conv.
                    </div>
                    <div className="text-lg font-semibold">{stat.avgMessagesPerConversation}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>Click on a conversation to view details</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <CustomerConversationsList onConversationSelect={handleConversationSelect} />
        </CardContent>
      </Card>

      {/* Conversation Detail Sheet */}
      <Sheet open={!!selectedConversationId} onOpenChange={handleCloseDetail}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Conversation Details</SheetTitle>
            <SheetDescription>
              View the complete conversation history
            </SheetDescription>
          </SheetHeader>
          {selectedConversationId && (
            <CustomerConversationDetail 
              conversationId={selectedConversationId}
              onBack={handleCloseDetail}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}