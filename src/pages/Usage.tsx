import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  MessageSquare,
  Bot,
  TrendingUp,
  Activity,
  Phone,
  MessageCircle,
  Clock,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface ChatbotStats {
  id: string;
  name: string;
  is_active: boolean;
  theme_color: string;
  conversations: number;
  messages: number;
}

interface VoiceAssistantStats {
  id: string;
  name: string;
  calls: number;
  minutes: number;
  avgDuration: number;
}

interface WhatsAppAgentStats {
  id: string;
  name: string;
  status: string;
  conversations: number;
  messages: number;
}

interface DailyData {
  date: string;
  chatMessages: number;
  voiceCalls: number;
  whatsappMessages: number;
}

type TimeRange = '7d' | '30d' | 'all';

const Usage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Aggregate stats
  const [totalChatConversations, setTotalChatConversations] = useState(0);
  const [totalChatMessages, setTotalChatMessages] = useState(0);
  const [totalVoiceCalls, setTotalVoiceCalls] = useState(0);
  const [totalVoiceMinutes, setTotalVoiceMinutes] = useState(0);
  const [avgCallDuration, setAvgCallDuration] = useState(0);
  const [totalWhatsAppConversations, setTotalWhatsAppConversations] = useState(0);
  const [totalWhatsAppMessages, setTotalWhatsAppMessages] = useState(0);

  // Per-agent stats
  const [chatbotStats, setChatbotStats] = useState<ChatbotStats[]>([]);
  const [voiceStats, setVoiceStats] = useState<VoiceAssistantStats[]>([]);
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppAgentStats[]>([]);

  // Chart data
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  // Agent counts
  const [activeChatbots, setActiveChatbots] = useState(0);
  const [totalVoiceAssistants, setTotalVoiceAssistants] = useState(0);
  const [activeWhatsAppAgents, setActiveWhatsAppAgents] = useState(0);
  const [totalWhatsAppAgents, setTotalWhatsAppAgents] = useState(0);

  const getDaysFromRange = (range: TimeRange): number | null => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case 'all': return null;
    }
  };

  const fetchUsageData = async () => {
    if (!user?.id) return;

    try {
      const days = getDaysFromRange(timeRange);
      const startDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;

      // ---- CHATBOTS ----
      // Fetch chatbots (same pattern as Dashboard - user_id filter)
      const { data: chatbotsData, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id, name, is_active, theme_color')
        .eq('user_id', user.id);

      if (chatbotsError) throw chatbotsError;

      const chatbotIds = chatbotsData?.map(c => c.id) || [];
      setActiveChatbots(chatbotsData?.filter(c => c.is_active).length || 0);

      // Per-chatbot stats
      const chatbotStatsArr: ChatbotStats[] = [];
      let chatConvTotal = 0;
      let chatMsgTotal = 0;

      for (const bot of chatbotsData || []) {
        let convQuery = supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('chatbot_id', bot.id);
        if (startDate) convQuery = convQuery.gte('created_at', startDate);

        const { count: convCount } = await convQuery;

        let msgQuery = supabase
          .from('messages')
          .select('id, conversations!inner(chatbot_id)', { count: 'exact', head: true })
          .eq('conversations.chatbot_id', bot.id);
        if (startDate) msgQuery = msgQuery.gte('created_at', startDate);

        const { count: msgCount } = await msgQuery;

        const conversations = convCount || 0;
        const messages = msgCount || 0;
        chatConvTotal += conversations;
        chatMsgTotal += messages;

        chatbotStatsArr.push({
          id: bot.id,
          name: bot.name,
          is_active: bot.is_active,
          theme_color: bot.theme_color,
          conversations,
          messages,
        });
      }

      chatbotStatsArr.sort((a, b) => b.messages - a.messages);
      setChatbotStats(chatbotStatsArr);
      setTotalChatConversations(chatConvTotal);
      setTotalChatMessages(chatMsgTotal);

      // ---- VOICE ASSISTANTS ----
      // Fetch voice assistants (same pattern as Dashboard - RLS handles access)
      const { data: voiceAssistants, error: vaError } = await supabase
        .from('voice_assistants')
        .select('id, name, org_id');

      if (vaError) throw vaError;

      const assistantIds = voiceAssistants?.map(a => a.id) || [];
      setTotalVoiceAssistants(voiceAssistants?.length || 0);

      const voiceStatsArr: VoiceAssistantStats[] = [];
      let callsTotal = 0;
      let minutesTotal = 0;
      let durationTotal = 0;
      let callsWithDuration = 0;

      for (const assistant of voiceAssistants || []) {
        let callCountQuery = supabase
          .from('voice_assistant_calls')
          .select('*', { count: 'exact', head: true })
          .eq('assistant_id', assistant.id);
        if (startDate) callCountQuery = callCountQuery.gte('created_at', startDate);

        const { count: callCount } = await callCountQuery;

        let durationQuery = supabase
          .from('voice_assistant_calls')
          .select('duration_seconds')
          .eq('assistant_id', assistant.id)
          .not('duration_seconds', 'is', null)
          .gt('duration_seconds', 0);
        if (startDate) durationQuery = durationQuery.gte('created_at', startDate);

        const { data: durationData } = await durationQuery.limit(50000);

        const calls = callCount || 0;
        let assistantMinutes = 0;
        let assistantAvgDuration = 0;

        if (durationData && durationData.length > 0) {
          const totalDur = durationData.reduce((s, c) => s + (c.duration_seconds || 0), 0);
          assistantMinutes = Math.round(totalDur / 60);
          assistantAvgDuration = Math.round(totalDur / durationData.length);
          durationTotal += totalDur;
          callsWithDuration += durationData.length;
        }

        callsTotal += calls;
        minutesTotal += assistantMinutes;

        voiceStatsArr.push({
          id: assistant.id,
          name: assistant.name || 'Unnamed Assistant',
          calls,
          minutes: assistantMinutes,
          avgDuration: assistantAvgDuration,
        });
      }

      voiceStatsArr.sort((a, b) => b.calls - a.calls);
      setVoiceStats(voiceStatsArr);
      setTotalVoiceCalls(callsTotal);
      setTotalVoiceMinutes(minutesTotal);
      setAvgCallDuration(callsWithDuration > 0 ? Math.round(durationTotal / callsWithDuration) : 0);

      // ---- WHATSAPP AGENTS ----
      // Fetch WhatsApp agents (same pattern as Dashboard - user_id filter)
      const { data: waAgents, error: waError } = await supabase
        .from('whatsapp_agents')
        .select('id, name, status')
        .eq('user_id', user.id);

      if (waError) throw waError;

      const agentIds = waAgents?.map(a => a.id) || [];
      setTotalWhatsAppAgents(waAgents?.length || 0);
      setActiveWhatsAppAgents(waAgents?.filter(a => a.status === 'active').length || 0);

      const waStatsArr: WhatsAppAgentStats[] = [];
      let waConvTotal = 0;
      let waMsgTotal = 0;

      for (const agent of waAgents || []) {
        let waConvQuery = supabase
          .from('whatsapp_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id);
        if (startDate) waConvQuery = waConvQuery.gte('created_at', startDate);

        const { count: waConvCount } = await waConvQuery;

        let waMsgQuery = supabase
          .from('whatsapp_messages')
          .select('id, whatsapp_conversations!inner(agent_id)', { count: 'exact', head: true })
          .eq('whatsapp_conversations.agent_id', agent.id);
        if (startDate) waMsgQuery = waMsgQuery.gte('created_at', startDate);

        const { count: waMsgCount } = await waMsgQuery;

        const conversations = waConvCount || 0;
        const messages = waMsgCount || 0;
        waConvTotal += conversations;
        waMsgTotal += messages;

        waStatsArr.push({
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          status: agent.status,
          conversations,
          messages,
        });
      }

      waStatsArr.sort((a, b) => b.messages - a.messages);
      setWhatsappStats(waStatsArr);
      setTotalWhatsAppConversations(waConvTotal);
      setTotalWhatsAppMessages(waMsgTotal);

      // ---- DAILY CHART DATA ----
      const chartDays = days || 30; // default 30 for "all" chart display
      const chartStartDate = new Date(Date.now() - chartDays * 24 * 60 * 60 * 1000).toISOString();

      // Initialize day map
      const dayMap = new Map<string, { chatMessages: number; voiceCalls: number; whatsappMessages: number }>();
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap.set(key, { chatMessages: 0, voiceCalls: 0, whatsappMessages: 0 });
      }

      // Fetch chat messages for chart
      if (chatbotIds.length > 0) {
        const { data: chatMsgs } = await supabase
          .from('messages')
          .select('created_at, conversations!inner(chatbot_id)')
          .in('conversations.chatbot_id', chatbotIds)
          .gte('created_at', chartStartDate)
          .limit(50000);

        chatMsgs?.forEach(msg => {
          const key = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const entry = dayMap.get(key);
          if (entry) entry.chatMessages++;
        });
      }

      // Fetch voice calls for chart
      if (assistantIds.length > 0) {
        const { data: calls } = await supabase
          .from('voice_assistant_calls')
          .select('created_at')
          .in('assistant_id', assistantIds)
          .gte('created_at', chartStartDate)
          .limit(50000);

        calls?.forEach(call => {
          const key = new Date(call.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const entry = dayMap.get(key);
          if (entry) entry.voiceCalls++;
        });
      }

      // Fetch WhatsApp messages for chart
      if (agentIds.length > 0) {
        const { data: waMsgs } = await supabase
          .from('whatsapp_messages')
          .select('created_at, whatsapp_conversations!inner(agent_id)')
          .in('whatsapp_conversations.agent_id', agentIds)
          .gte('created_at', chartStartDate)
          .limit(50000);

        waMsgs?.forEach(msg => {
          const key = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const entry = dayMap.get(key);
          if (entry) entry.whatsappMessages++;
        });
      }

      const dailyArr = Array.from(dayMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));
      setDailyData(dailyArr);

    } catch (error: any) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchUsageData();

    // Real-time subscriptions (same pattern as Dashboard)
    const channels = [
      supabase.channel('usage-chatbots').on('postgres_changes', { event: '*', schema: 'public', table: 'chatbots' }, fetchUsageData).subscribe(),
      supabase.channel('usage-conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchUsageData).subscribe(),
      supabase.channel('usage-messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUsageData).subscribe(),
      supabase.channel('usage-voice-assistants').on('postgres_changes', { event: '*', schema: 'public', table: 'voice_assistants' }, fetchUsageData).subscribe(),
      supabase.channel('usage-voice-calls').on('postgres_changes', { event: '*', schema: 'public', table: 'voice_assistant_calls' }, fetchUsageData).subscribe(),
      supabase.channel('usage-wa-agents').on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_agents' }, fetchUsageData).subscribe(),
      supabase.channel('usage-wa-conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, fetchUsageData).subscribe(),
      supabase.channel('usage-wa-messages').on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, fetchUsageData).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user?.id, timeRange]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return `${hours}h ${rem}m`;
  };

  const totalInteractions = totalChatConversations + totalVoiceCalls + totalWhatsAppConversations;
  const totalAgents = chatbotStats.length + voiceStats.length + whatsappStats.length;

  if (!user) {
    return <div className="p-6 text-muted-foreground">Please log in to view usage analytics.</div>;
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usage Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor performance across all your AI agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </div>
          <div className="flex bg-muted rounded-lg p-0.5">
            {(['7d', '30d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => { setLoading(true); setTimeRange(range); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-80 bg-muted rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 border-0 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Interactions</p>
                  <p className="text-3xl font-bold mt-1">{totalInteractions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalAgents} active agents</p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Chat Messages</p>
                  <p className="text-3xl font-bold mt-1">{totalChatMessages.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalChatConversations.toLocaleString()} conversations</p>
                </div>
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-0 bg-gradient-to-br from-violet-500/5 to-violet-500/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Voice Minutes</p>
                  <p className="text-3xl font-bold mt-1">{totalVoiceMinutes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalVoiceCalls.toLocaleString()} calls</p>
                </div>
                <div className="p-2.5 bg-violet-500/10 rounded-xl">
                  <Phone className="h-5 w-5 text-violet-500" />
                </div>
              </div>
            </Card>

            <Card className="p-5 border-0 bg-gradient-to-br from-green-500/5 to-green-500/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">WhatsApp Messages</p>
                  <p className="text-3xl font-bold mt-1">{totalWhatsAppMessages.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalWhatsAppConversations.toLocaleString()} conversations</p>
                </div>
                <div className="p-2.5 bg-green-500/10 rounded-xl">
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Activity Over Time</CardTitle>
                  <CardDescription>Daily interactions across all agents</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="voiceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="waGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      interval={timeRange === '7d' ? 0 : 'preserveStartEnd'}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="chatMessages"
                      name="Chat Messages"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#chatGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="voiceCalls"
                      name="Voice Calls"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#voiceGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="whatsappMessages"
                      name="WhatsApp Messages"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#waGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No activity data yet</p>
                  </div>
                </div>
              )}
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Chat Messages
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  Voice Calls
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  WhatsApp
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Breakdown Tabs */}
          <Tabs defaultValue="chatbots" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chatbots" className="gap-2">
                <Bot className="w-3.5 h-3.5" />
                Chatbots
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{chatbotStats.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-2">
                <Phone className="w-3.5 h-3.5" />
                Voice
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{voiceStats.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{whatsappStats.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Chatbots Tab */}
            <TabsContent value="chatbots">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Chatbot Performance</CardTitle>
                      <CardDescription>
                        {activeChatbots} active out of {chatbotStats.length} chatbot{chatbotStats.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold">{totalChatConversations.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Conversations</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{totalChatMessages.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Messages</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {totalChatConversations > 0 ? Math.round(totalChatMessages / totalChatConversations * 10) / 10 : 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg/Conv</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {chatbotStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Bot className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm font-medium">No chatbots yet</p>
                      <p className="text-xs mt-1">Create a chatbot to see its analytics here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatbotStats.map((bot, index) => (
                        <div key={bot.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: bot.theme_color || '#3b82f6' }}
                            >
                              {bot.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{bot.name}</p>
                                <Badge variant={bot.is_active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                  {bot.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {bot.conversations} conversation{bot.conversations !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{bot.messages.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">messages</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Tab */}
            <TabsContent value="voice">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Voice Assistant Performance</CardTitle>
                      <CardDescription>
                        {totalVoiceAssistants} voice assistant{totalVoiceAssistants !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold">{totalVoiceCalls.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Calls</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{totalVoiceMinutes.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Minutes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatDuration(avgCallDuration)}</p>
                        <p className="text-xs text-muted-foreground">Avg Duration</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {voiceStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Phone className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm font-medium">No voice assistants yet</p>
                      <p className="text-xs mt-1">Create a voice assistant to see call analytics here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {voiceStats.map((assistant) => (
                        <div key={assistant.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                              <Phone className="w-4 h-4 text-violet-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{assistant.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {assistant.calls} call{assistant.calls !== 1 ? 's' : ''} · avg {formatDuration(assistant.avgDuration)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{assistant.minutes.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">minutes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">WhatsApp Agent Performance</CardTitle>
                      <CardDescription>
                        {activeWhatsAppAgents} active out of {totalWhatsAppAgents} agent{totalWhatsAppAgents !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold">{totalWhatsAppConversations.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Conversations</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{totalWhatsAppMessages.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Messages</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {totalWhatsAppConversations > 0 ? Math.round(totalWhatsAppMessages / totalWhatsAppConversations * 10) / 10 : 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg/Conv</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {whatsappStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm font-medium">No WhatsApp agents yet</p>
                      <p className="text-xs mt-1">Create a WhatsApp agent to see its analytics here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {whatsappStats.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <MessageCircle className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{agent.name}</p>
                                <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                  {agent.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {agent.conversations} conversation{agent.conversations !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{agent.messages.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">messages</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Usage;
