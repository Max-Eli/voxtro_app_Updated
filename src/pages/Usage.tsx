import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageSquare, Bot, TrendingUp, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface BotUsage {
  id: string;
  name: string;
  conversations: number;
  messages: number;
  theme_color: string;
}

interface DailyMessage {
  date: string;
  messages: number;
}

interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalBots: number;
  avgMessagesPerConversation: number;
}

const Usage = () => {
  const { user } = useAuth();
  const [botUsage, setBotUsage] = useState<BotUsage[]>([]);
  const [dailyMessages, setDailyMessages] = useState<DailyMessage[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalConversations: 0,
    totalMessages: 0,
    totalBots: 0,
    avgMessagesPerConversation: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchUsageData = async () => {
    if (!user) return;

    try {
      // Get bot usage statistics
      const { data: botsData, error: botsError } = await supabase
        .from('chatbots')
        .select('id, name, theme_color')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (botsError) throw botsError;

      // Get conversation and message counts for each bot
      const botUsageData: BotUsage[] = [];
      let totalConversations = 0;
      let totalMessages = 0;

      for (const bot of botsData || []) {
        // Count conversations for this bot
        const { count: conversationCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('chatbot_id', bot.id);

        // Count messages for this bot
        const { count: messageCount } = await supabase
          .from('messages')
          .select(`
            *,
            conversations!inner(chatbot_id)
          `, { count: 'exact', head: true })
          .eq('conversations.chatbot_id', bot.id);

        const conversations = conversationCount || 0;
        const messages = messageCount || 0;

        botUsageData.push({
          id: bot.id,
          name: bot.name,
          conversations,
          messages,
          theme_color: bot.theme_color,
        });

        totalConversations += conversations;
        totalMessages += messages;
      }

      // Sort bots by activity (most messages first)
      botUsageData.sort((a, b) => b.messages - a.messages);
      setBotUsage(botUsageData);

      // Get daily message statistics for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: dailyData, error: dailyError } = await supabase
        .from('messages')
        .select(`
          created_at,
          conversations!inner(
            chatbot_id,
            chatbots!inner(user_id)
          )
        `)
        .eq('conversations.chatbots.user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (dailyError) throw dailyError;

      // Group messages by day
      const messagesByDay = new Map<string, number>();
      
      // Initialize with zeros for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        messagesByDay.set(dateStr, 0);
      }

      // Count actual messages by day
      dailyData?.forEach(message => {
        const date = new Date(message.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        messagesByDay.set(dateStr, (messagesByDay.get(dateStr) || 0) + 1);
      });

      const dailyMessageArray = Array.from(messagesByDay.entries()).map(([date, messages]) => ({
        date,
        messages,
      }));

      setDailyMessages(dailyMessageArray);

      // Set overall usage statistics
      setUsageStats({
        totalConversations,
        totalMessages,
        totalBots: botsData?.length || 0,
        avgMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations * 100) / 100 : 0,
      });

    } catch (error: any) {
      console.error('Error fetching usage data:', error);
      toast({
        title: "Error",
        description: "Failed to load usage analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchUsageData, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  if (!user) {
    return <div>Please log in to view usage analytics.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-2 text-primary" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Usage Analytics</h1>
        <p className="text-muted-foreground">Monitor your chatbot performance and usage statistics</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalBots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages/Conv</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.avgMessagesPerConversation}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6">
        {/* Daily Messages Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Messages Per Day</CardTitle>
            <CardDescription>Last 7 days message volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyMessages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Bot Stats */}
      {botUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bot Details</CardTitle>
            <CardDescription>Detailed statistics for each bot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {botUsage.map((bot, index) => (
                <div key={bot.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: bot.theme_color }}
                    />
                    <div>
                      <p className="font-medium">{bot.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {bot.conversations} conversations • {bot.messages} messages
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{bot.messages}</p>
                    <p className="text-sm text-muted-foreground">total messages</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Usage;