import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  MessageSquare,
  Bot,
  Activity,
  Phone,
  MessageCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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

  // Once UI-inspired tooltip style
  const tooltipStyle = {
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    border: 'none',
    borderRadius: '16px',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
    padding: '12px 16px',
  };

  // Once UI color palette
  const colors = {
    blue: { main: '#4C8BF5', light: '#4C8BF520', gradient: '#4C8BF5' },
    violet: { main: '#7C5CFC', light: '#7C5CFC20', gradient: '#7C5CFC' },
    emerald: { main: '#34D399', light: '#34D39920', gradient: '#34D399' },
    neutral: { main: '#94A3B8', light: '#94A3B810' },
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Real-time performance metrics across all agents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-3.5 py-2 rounded-2xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Live
          </div>
          <div className="flex bg-muted/60 rounded-2xl p-1">
            {(['7d', '30d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => { setLoading(true); setTimeRange(range); }}
                className={`px-4 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 ${
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
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/40 rounded-2xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-muted/40 rounded-2xl animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics - Once UI glass cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/30 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-[60px]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{totalInteractions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{totalAgents} active agents</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-blue-50/30 dark:to-blue-500/5 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/8 to-transparent rounded-bl-[60px]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: colors.blue.light }}>
                    <MessageSquare className="h-4 w-4" style={{ color: colors.blue.main }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chat</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{totalChatMessages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{totalChatConversations.toLocaleString()} conversations</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-violet-50/30 dark:to-violet-500/5 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-500/8 to-transparent rounded-bl-[60px]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: colors.violet.light }}>
                    <Phone className="h-4 w-4" style={{ color: colors.violet.main }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{totalVoiceMinutes.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{totalVoiceCalls.toLocaleString()} calls</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-emerald-50/30 dark:to-emerald-500/5 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-bl-[60px]" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: colors.emerald.light }}>
                    <MessageCircle className="h-4 w-4" style={{ color: colors.emerald.main }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WhatsApp</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{totalWhatsAppMessages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{totalWhatsAppConversations.toLocaleString()} conversations</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Activity Over Time - Line chart, no grid, smooth curves */}
            <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-sm font-semibold">Activity Over Time</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Daily interactions across all agents</p>
              </div>
              <div className="px-4 pb-4">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyData} margin={{ top: 20, right: 16, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.blue.main} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={colors.blue.main} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="voiceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.violet.main} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={colors.violet.main} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="waGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.emerald.main} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={colors.emerald.main} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={timeRange === '7d' ? 0 : 'preserveStartEnd'} dy={8} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} dx={-4} />
                      <RechartsTooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="chatMessages" name="Chat Messages" stroke={colors.blue.main} strokeWidth={2.5} fill="url(#chatGrad)" dot={false} activeDot={{ r: 5, fill: colors.blue.main, stroke: '#fff', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="voiceCalls" name="Voice Calls" stroke={colors.violet.main} strokeWidth={2.5} fill="url(#voiceGrad)" dot={false} activeDot={{ r: 5, fill: colors.violet.main, stroke: '#fff', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="whatsappMessages" name="WhatsApp Messages" stroke={colors.emerald.main} strokeWidth={2.5} fill="url(#waGrad)" dot={false} activeDot={{ r: 5, fill: colors.emerald.main, stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No activity data yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Data will appear as agents are used</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: colors.blue.main }} />Chat</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: colors.violet.main }} />Voice</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: colors.emerald.main }} />WhatsApp</div>
                </div>
              </div>
            </div>

            {/* Distribution Donut - Once UI minimal style */}
            <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-sm font-semibold">Distribution</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Interactions by agent type</p>
              </div>
              <div className="px-6 pb-6 flex flex-col items-center justify-center">
                {totalInteractions > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Chatbot', value: totalChatConversations, color: colors.blue.main },
                            { name: 'Voice', value: totalVoiceCalls, color: colors.violet.main },
                            { name: 'WhatsApp', value: totalWhatsAppConversations, color: colors.emerald.main },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {[
                            { name: 'Chatbot', value: totalChatConversations, color: colors.blue.main },
                            { name: 'Voice', value: totalVoiceCalls, color: colors.violet.main },
                            { name: 'WhatsApp', value: totalWhatsAppConversations, color: colors.emerald.main },
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-3 w-full mt-3">
                      {[
                        { label: 'Chatbots', value: totalChatConversations, color: colors.blue.main },
                        { label: 'Voice', value: totalVoiceCalls, color: colors.violet.main },
                        { label: 'WhatsApp', value: totalWhatsAppConversations, color: colors.emerald.main },
                      ].map(item => {
                        const pct = totalInteractions > 0 ? Math.round(item.value / totalInteractions * 100) : 0;
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="font-medium">{item.label}</span>
                              </div>
                              <span className="text-muted-foreground">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No data yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agent Breakdown Tabs - Once UI pill tabs */}
          <Tabs defaultValue="chatbots" className="space-y-5">
            <TabsList className="bg-muted/40 rounded-2xl p-1 h-auto">
              <TabsTrigger value="chatbots" className="gap-2 rounded-xl data-[state=active]:shadow-sm py-2 px-4">
                <Bot className="w-3.5 h-3.5" />
                Chatbots
                <span className="ml-1 text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded-lg">{chatbotStats.length}</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-2 rounded-xl data-[state=active]:shadow-sm py-2 px-4">
                <Phone className="w-3.5 h-3.5" />
                Voice
                <span className="ml-1 text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded-lg">{voiceStats.length}</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2 rounded-xl data-[state=active]:shadow-sm py-2 px-4">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
                <span className="ml-1 text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded-lg">{whatsappStats.length}</span>
              </TabsTrigger>
            </TabsList>

            {/* Chatbots Tab */}
            <TabsContent value="chatbots" className="space-y-5">
              {chatbotStats.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
                  <div className="px-6 pt-6 pb-2">
                    <h3 className="text-sm font-semibold">Messages by Chatbot</h3>
                  </div>
                  <div className="px-4 pb-5">
                    <ResponsiveContainer width="100%" height={Math.max(chatbotStats.length * 52, 120)}>
                      <BarChart data={chatbotStats} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 8 }} />
                        <Bar dataKey="messages" name="Messages" radius={[0, 8, 8, 0]} barSize={22}>
                          {chatbotStats.map((bot) => (
                            <Cell key={bot.id} fill={bot.theme_color || colors.blue.main} fillOpacity={0.85} />
                          ))}
                        </Bar>
                        <Bar dataKey="conversations" name="Conversations" radius={[0, 8, 8, 0]} barSize={22} fill={colors.neutral.main} fillOpacity={0.15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Chatbot Details</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{activeChatbots} active out of {chatbotStats.length}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-right"><p className="font-bold text-lg">{totalChatConversations.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversations</p></div>
                      <div className="text-right"><p className="font-bold text-lg">{totalChatMessages.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Messages</p></div>
                      <div className="text-right"><p className="font-bold text-lg">{totalChatConversations > 0 ? Math.round(totalChatMessages / totalChatConversations * 10) / 10 : 0}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg/Conv</p></div>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  {chatbotStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Bot className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No chatbots yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatbotStats.map((bot) => {
                        const maxMsg = Math.max(...chatbotStats.map(b => b.messages), 1);
                        return (
                          <div key={bot.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/30 hover:border-border/60 bg-background/50 hover:bg-background/80 transition-all duration-200 group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm" style={{ backgroundColor: bot.theme_color || colors.blue.main }}>
                              {bot.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-2">
                                <p className="text-sm font-semibold truncate">{bot.name}</p>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${bot.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                  {bot.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(bot.messages / maxMsg) * 100}%`, backgroundColor: bot.theme_color || colors.blue.main }} />
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{bot.conversations} conversations</span>
                                <span>{bot.messages} messages</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-4">
                              <p className="text-xl font-bold">{bot.messages.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">msgs</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Voice Tab */}
            <TabsContent value="voice" className="space-y-5">
              {voiceStats.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
                  <div className="px-6 pt-6 pb-2">
                    <h3 className="text-sm font-semibold">Call Minutes by Assistant</h3>
                  </div>
                  <div className="px-4 pb-5">
                    <ResponsiveContainer width="100%" height={Math.max(voiceStats.length * 52, 120)}>
                      <BarChart data={voiceStats} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 8 }} />
                        <Bar dataKey="minutes" name="Minutes" radius={[0, 8, 8, 0]} barSize={22} fill={colors.violet.main} fillOpacity={0.85} />
                        <Bar dataKey="calls" name="Calls" radius={[0, 8, 8, 0]} barSize={22} fill={colors.violet.main} fillOpacity={0.2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Voice Assistant Details</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{totalVoiceAssistants} assistant{totalVoiceAssistants !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-right"><p className="font-bold text-lg">{totalVoiceCalls.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Calls</p></div>
                      <div className="text-right"><p className="font-bold text-lg">{totalVoiceMinutes.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Minutes</p></div>
                      <div className="text-right"><p className="font-bold text-lg">{formatDuration(avgCallDuration)}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Duration</p></div>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  {voiceStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Phone className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No voice assistants yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {voiceStats.map((assistant) => {
                        const maxMin = Math.max(...voiceStats.map(a => a.minutes), 1);
                        return (
                          <div key={assistant.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/30 hover:border-border/60 bg-background/50 hover:bg-background/80 transition-all duration-200 group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: colors.violet.light }}>
                              <Phone className="w-4.5 h-4.5" style={{ color: colors.violet.main }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate mb-2">{assistant.name}</p>
                              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(assistant.minutes / maxMin) * 100}%`, backgroundColor: colors.violet.main }} />
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{assistant.calls} calls</span>
                                <span>{assistant.minutes} min</span>
                                <span>avg {formatDuration(assistant.avgDuration)}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-4">
                              <p className="text-xl font-bold">{assistant.minutes.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">min</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-5">
              {whatsappStats.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
                  <div className="px-6 pt-6 pb-2">
                    <h3 className="text-sm font-semibold">Messages by WhatsApp Agent</h3>
                  </div>
                  <div className="px-4 pb-5">
                    <ResponsiveContainer width="100%" height={Math.max(whatsappStats.length * 52, 120)}>
                      <BarChart data={whatsappStats} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 8 }} />
                        <Bar dataKey="messages" name="Messages" radius={[0, 8, 8, 0]} barSize={22} fill={colors.emerald.main} fillOpacity={0.85} />
                        <Bar dataKey="conversations" name="Conversations" radius={[0, 8, 8, 0]} barSize={22} fill={colors.emerald.main} fillOpacity={0.2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">WhatsApp Agent Details</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{activeWhatsAppAgents} active out of {totalWhatsAppAgents}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-right"><p className="font-bold text-lg">{totalWhatsAppConversations.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversations</p></div>
                      <div className="text-right"><p className="font-bold text-lg">{totalWhatsAppMessages.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Messages</p></div>
                      <div className="text-right"><p className="font-bold text-lg">{totalWhatsAppConversations > 0 ? Math.round(totalWhatsAppMessages / totalWhatsAppConversations * 10) / 10 : 0}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg/Conv</p></div>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  {whatsappStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No WhatsApp agents yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {whatsappStats.map((agent) => {
                        const maxMsg = Math.max(...whatsappStats.map(a => a.messages), 1);
                        return (
                          <div key={agent.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/30 hover:border-border/60 bg-background/50 hover:bg-background/80 transition-all duration-200 group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: colors.emerald.light }}>
                              <MessageCircle className="w-4.5 h-4.5" style={{ color: colors.emerald.main }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-2">
                                <p className="text-sm font-semibold truncate">{agent.name}</p>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${agent.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                  {agent.status}
                                </span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(agent.messages / maxMsg) * 100}%`, backgroundColor: colors.emerald.main }} />
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{agent.conversations} conversations</span>
                                <span>{agent.messages} messages</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-4">
                              <p className="text-xl font-bold">{agent.messages.toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">msgs</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Usage;
