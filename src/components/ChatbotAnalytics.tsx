import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, TrendingUp, Clock, Users } from 'lucide-react';

interface AnalyticsData {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  dailyStats: Array<{
    date: string;
    conversations: number;
    messages: number;
  }>;
  hourlyStats: Array<{
    hour: number;
    conversations: number;
  }>;
}

interface ChatbotAnalyticsProps {
  chatbotId: string;
}

export function ChatbotAnalytics({ chatbotId }: ChatbotAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalConversations: 0,
    totalMessages: 0,
    avgMessagesPerConversation: 0,
    dailyStats: [],
    hourlyStats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [chatbotId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get total conversations
      const { count: conversationsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('chatbot_id', chatbotId);

      // Get total messages
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*, conversations!inner(*)', { count: 'exact', head: true })
        .eq('conversations.chatbot_id', chatbotId);

      // Get daily stats for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: dailyConversations } = await supabase
        .from('conversations')
        .select('created_at')
        .eq('chatbot_id', chatbotId)
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: dailyMessages } = await supabase
        .from('messages')
        .select('created_at, conversations!inner(chatbot_id)')
        .eq('conversations.chatbot_id', chatbotId)
        .gte('created_at', sevenDaysAgo.toISOString());

      // Process daily stats
      const dailyStatsMap = new Map();
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyStatsMap.set(dateKey, { date: dateKey, conversations: 0, messages: 0 });
      }

      dailyConversations?.forEach(conv => {
        const dateKey = conv.created_at.split('T')[0];
        const existing = dailyStatsMap.get(dateKey);
        if (existing) {
          existing.conversations++;
        }
      });

      dailyMessages?.forEach(msg => {
        const dateKey = msg.created_at.split('T')[0];
        const existing = dailyStatsMap.get(dateKey);
        if (existing) {
          existing.messages++;
        }
      });

      // Get hourly stats
      const { data: hourlyConversations } = await supabase
        .from('conversations')
        .select('created_at')
        .eq('chatbot_id', chatbotId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const hourlyStatsMap = new Map();
      for (let i = 0; i < 24; i++) {
        hourlyStatsMap.set(i, { hour: i, conversations: 0 });
      }

      hourlyConversations?.forEach(conv => {
        const hour = new Date(conv.created_at).getHours();
        const existing = hourlyStatsMap.get(hour);
        if (existing) {
          existing.conversations++;
        }
      });

      setAnalytics({
        totalConversations: conversationsCount || 0,
        totalMessages: messagesCount || 0,
        avgMessagesPerConversation: conversationsCount > 0 ? Math.round((messagesCount || 0) / conversationsCount * 10) / 10 : 0,
        dailyStats: Array.from(dailyStatsMap.values()),
        hourlyStats: Array.from(hourlyStatsMap.values())
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalConversations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages/Conv</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgMessagesPerConversation}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.dailyStats[analytics.dailyStats.length - 1]?.conversations || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
            <CardDescription>Conversations and messages over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                conversations: {
                  label: "Conversations",
                  color: "hsl(var(--primary))",
                },
                messages: {
                  label: "Messages",
                  color: "hsl(var(--secondary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyStats}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="conversations" fill="hsl(var(--primary))" />
                  <Bar dataKey="messages" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Distribution (Last 24h)</CardTitle>
            <CardDescription>When users are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                conversations: {
                  label: "Conversations",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.hourlyStats}>
                  <XAxis 
                    dataKey="hour"
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="conversations" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}