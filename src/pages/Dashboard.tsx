import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import {
  Bot,
  MessageSquare,
  Phone,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  MessageCircle,
  Users,
  Ticket,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
  FileCheck
} from 'lucide-react';
import { PendingContentReview } from '@/components/PendingContentReview';

interface DashboardStats {
  totalChatbots: number;
  activeChatbots: number;
  totalConversations: number;
  totalMessages: number;
  totalVoiceAssistants: number;
  totalVoiceCalls: number;
  totalCallMinutes: number;
  avgMessagesPerConversation: number;
  avgCallDuration: number;
  totalWhatsAppAgents: number;
  activeWhatsAppAgents: number;
  totalWhatsAppConversations: number;
  totalWhatsAppMessages: number;
  totalCustomers: number;
  openTickets: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assistant_id: string;
  org_id: string | null;
}

interface VoiceAssistant {
  id: string;
  name: string | null;
  org_id: string | null;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customer_name: string;
  created_at: string;
  updated_at: string;
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'call' | 'ticket' | 'whatsapp';
  title: string;
  subtitle: string;
  timestamp: string;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalChatbots: 0,
    activeChatbots: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalVoiceAssistants: 0,
    totalVoiceCalls: 0,
    totalCallMinutes: 0,
    avgMessagesPerConversation: 0,
    avgCallDuration: 0,
    totalWhatsAppAgents: 0,
    activeWhatsAppAgents: 0,
    totalWhatsAppConversations: 0,
    totalWhatsAppMessages: 0,
    totalCustomers: 0,
    openTickets: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [assistants, setAssistants] = useState<VoiceAssistant[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch chatbot stats
      const { data: chatbots, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id, is_active')
        .eq('user_id', user.id);

      if (chatbotsError) throw chatbotsError;

      const totalChatbots = chatbots?.length || 0;
      const activeChatbots = chatbots?.filter((c) => c.is_active).length || 0;
      const chatbotIds = chatbots?.map((c) => c.id) || [];

      // Conversations count
      let totalConversations = 0;
      if (chatbotIds.length > 0) {
        const { count, error } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .in('chatbot_id', chatbotIds);

        if (error) throw error;
        totalConversations = count || 0;
      }

      // Messages count
      let totalMessages = 0;
      if (chatbotIds.length > 0) {
        const { count, error } = await supabase
          .from('messages')
          .select('id, conversations!inner(chatbot_id)', { count: 'exact', head: true })
          .in('conversations.chatbot_id', chatbotIds);

        if (error) throw error;
        totalMessages = count || 0;
      }

      // Voice assistants
      const { data: voiceAssistants, error: vaError } = await supabase
        .from('voice_assistants')
        .select('id, name, org_id')
        .eq('user_id', user.id);

      if (vaError) throw vaError;

      const totalVoiceAssistants = voiceAssistants?.length || 0;
      const assistantIds = voiceAssistants?.map((a) => a.id) || [];
      setAssistants(voiceAssistants || []);

      // Voice calls - use count: 'exact' for accurate count (Supabase defaults to 1000 limit)
      let totalVoiceCalls = 0;
      let avgCallDuration = 0;
      let totalCallMinutes = 0;

      if (assistantIds.length > 0) {
        // Get exact count first
        const { count: callCount, error: countError } = await supabase
          .from('voice_assistant_calls')
          .select('*', { count: 'exact', head: true })
          .in('assistant_id', assistantIds);

        if (countError) throw countError;
        totalVoiceCalls = callCount || 0;

        // Fetch duration data with high limit to calculate totals
        const { data: calls, error: callsError } = await supabase
          .from('voice_assistant_calls')
          .select('duration_seconds')
          .in('assistant_id', assistantIds)
          .not('duration_seconds', 'is', null)
          .gt('duration_seconds', 0)
          .limit(50000);

        if (callsError) throw callsError;

        if (calls && calls.length > 0) {
          const totalDuration = calls.reduce(
            (sum, call) => sum + (call.duration_seconds || 0),
            0
          );
          avgCallDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;
          totalCallMinutes = Math.round(totalDuration / 60);
        }
      }

      // WhatsApp agents
      const { data: whatsappAgents, error: waError } = await supabase
        .from('whatsapp_agents')
        .select('id, status')
        .eq('user_id', user.id);

      if (waError) throw waError;

      const totalWhatsAppAgents = whatsappAgents?.length || 0;
      const activeWhatsAppAgents =
        whatsappAgents?.filter((a) => a.status === 'active').length || 0;
      const agentIds = whatsappAgents?.map((a) => a.id) || [];

      // WhatsApp conversations count
      let totalWhatsAppConversations = 0;
      if (agentIds.length > 0) {
        const { count, error } = await supabase
          .from('whatsapp_conversations')
          .select('*', { count: 'exact', head: true })
          .in('agent_id', agentIds);

        if (error) throw error;
        totalWhatsAppConversations = count || 0;
      }

      // WhatsApp messages count
      let totalWhatsAppMessages = 0;
      if (agentIds.length > 0) {
        const { count, error } = await supabase
          .from('whatsapp_messages')
          .select('id, whatsapp_conversations!inner(agent_id)', {
            count: 'exact',
            head: true,
          })
          .in('whatsapp_conversations.agent_id', agentIds);

        if (error) throw error;
        totalWhatsAppMessages = count || 0;
      }

      // Customers count
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (customersError) throw customersError;

      // Open tickets count
      const { count: ticketsCount, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress']);

      if (ticketsError) throw ticketsError;

      // Upcoming tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('voice_assistant_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in-progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);

      if (tasksError) throw tasksError;
      setUpcomingTasks(tasks || []);

      // Recent support tickets
      const { data: ticketsData, error: recentTicketsError } = await supabase
        .from('support_tickets')
        .select('id, subject, status, priority, customer_name, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (recentTicketsError) throw recentTicketsError;
      setRecentTickets(ticketsData || []);

      // Build recent activity from various sources
      const activities: RecentActivity[] = [];

      // Recent chatbot conversations
      if (chatbotIds.length > 0) {
        const { data: recentConvos } = await supabase
          .from('conversations')
          .select('id, created_at, chatbot_id')
          .in('chatbot_id', chatbotIds)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentConvos) {
          for (const conv of recentConvos) {
            const chatbot = chatbots?.find(c => c.id === conv.chatbot_id);
            activities.push({
              id: `conv-${conv.id}`,
              type: 'conversation',
              title: 'New chatbot conversation',
              subtitle: chatbot ? `Chatbot` : 'Unknown chatbot',
              timestamp: conv.created_at
            });
          }
        }
      }

      // Recent voice calls
      if (assistantIds.length > 0) {
        const { data: recentCalls } = await supabase
          .from('voice_assistant_calls')
          .select('id, created_at, assistant_id, duration_seconds')
          .in('assistant_id', assistantIds)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentCalls) {
          for (const call of recentCalls) {
            const assistant = voiceAssistants?.find(a => a.id === call.assistant_id);
            activities.push({
              id: `call-${call.id}`,
              type: 'call',
              title: 'Voice call',
              subtitle: assistant?.name || 'Voice Assistant',
              timestamp: call.created_at
            });
          }
        }
      }

      // Recent WhatsApp conversations
      if (agentIds.length > 0) {
        const { data: recentWA } = await supabase
          .from('whatsapp_conversations')
          .select('id, created_at, agent_id')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentWA) {
          for (const wa of recentWA) {
            activities.push({
              id: `wa-${wa.id}`,
              type: 'whatsapp',
              title: 'WhatsApp conversation',
              subtitle: 'WhatsApp Agent',
              timestamp: wa.created_at
            });
          }
        }
      }

      // Recent tickets
      if (ticketsData) {
        for (const ticket of ticketsData.slice(0, 3)) {
          activities.push({
            id: `ticket-${ticket.id}`,
            type: 'ticket',
            title: ticket.subject,
            subtitle: ticket.customer_name,
            timestamp: ticket.updated_at
          });
        }
      }

      // Sort by timestamp and take top 8
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 8));

      const avgMessagesPerConversation =
        totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

      setStats({
        totalChatbots,
        activeChatbots,
        totalConversations,
        totalMessages,
        totalVoiceAssistants,
        totalVoiceCalls,
        totalCallMinutes,
        avgMessagesPerConversation,
        avgCallDuration,
        totalWhatsAppAgents,
        activeWhatsAppAgents,
        totalWhatsAppConversations,
        totalWhatsAppMessages,
        totalCustomers: customersCount || 0,
        openTickets: ticketsCount || 0,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user?.id) {
      setLoading(false);
      return;
    }

    if (user?.id && !authLoading) {
      fetchStats();

      // Set up real-time subscriptions
      const chatbotsChannel = supabase
        .channel('dashboard-chatbots')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chatbots' }, fetchStats)
        .subscribe();

      const conversationsChannel = supabase
        .channel('dashboard-conversations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchStats)
        .subscribe();

      const messagesChannel = supabase
        .channel('dashboard-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchStats)
        .subscribe();

      const assistantsChannel = supabase
        .channel('dashboard-assistants')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_assistants' }, fetchStats)
        .subscribe();

      const callsChannel = supabase
        .channel('dashboard-calls')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_assistant_calls' }, fetchStats)
        .subscribe();

      const tasksChannel = supabase
        .channel('dashboard-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_assistant_tasks' }, fetchStats)
        .subscribe();

      const whatsappAgentsChannel = supabase
        .channel('dashboard-whatsapp-agents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_agents' }, fetchStats)
        .subscribe();

      const whatsappConversationsChannel = supabase
        .channel('dashboard-whatsapp-conversations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, fetchStats)
        .subscribe();

      const whatsappMessagesChannel = supabase
        .channel('dashboard-whatsapp-messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, fetchStats)
        .subscribe();

      const ticketsChannel = supabase
        .channel('dashboard-tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchStats)
        .subscribe();

      return () => {
        supabase.removeChannel(chatbotsChannel);
        supabase.removeChannel(conversationsChannel);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(assistantsChannel);
        supabase.removeChannel(callsChannel);
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(whatsappAgentsChannel);
        supabase.removeChannel(whatsappConversationsChannel);
        supabase.removeChannel(whatsappMessagesChannel);
        supabase.removeChannel(ticketsChannel);
      };
    }
  }, [user?.id, authLoading]);

  const getAssistantName = (assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId);
    return assistant?.name || 'Unknown Assistant';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDueDateLabel = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) return { label: 'Overdue', className: 'text-destructive' };
    if (isToday(date)) return { label: 'Today', className: 'text-primary' };
    if (isTomorrow(date)) return { label: 'Tomorrow', className: 'text-yellow-600' };
    return { label: format(date, 'MMM d'), className: 'text-muted-foreground' };
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getTicketPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'call': return <Phone className="h-4 w-4 text-chart-5" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'ticket': return <Ticket className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your AI agents and customer interactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 cursor-pointer hover:shadow-md transition-all border-0 bg-gradient-to-br from-primary/5 to-primary/10" onClick={() => navigate('/chatbots')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                  <p className="text-3xl font-bold mt-1">{(stats.totalConversations + stats.totalWhatsAppConversations + stats.totalVoiceCalls).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Across all agents</p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-5 cursor-pointer hover:shadow-md transition-all border-0 bg-gradient-to-br from-chart-5/5 to-chart-5/10" onClick={() => navigate('/voice-assistants')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Voice Minutes</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalCallMinutes.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.totalVoiceCalls} total calls</p>
                </div>
                <div className="p-2.5 bg-chart-5/10 rounded-xl">
                  <Phone className="h-5 w-5 text-chart-5" />
                </div>
              </div>
            </Card>

            <Card className="p-5 cursor-pointer hover:shadow-md transition-all border-0 bg-gradient-to-br from-chart-2/5 to-chart-2/10" onClick={() => navigate('/customers')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customers</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
                </div>
                <div className="p-2.5 bg-chart-2/10 rounded-xl">
                  <Users className="h-5 w-5 text-chart-2" />
                </div>
              </div>
            </Card>

            <Card className={`p-5 cursor-pointer hover:shadow-md transition-all border-0 ${stats.openTickets > 0 ? 'bg-gradient-to-br from-yellow-500/5 to-yellow-500/10' : 'bg-gradient-to-br from-green-500/5 to-green-500/10'}`} onClick={() => navigate('/support-tickets')}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                  <p className="text-3xl font-bold mt-1">{stats.openTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.openTickets === 0 ? 'All resolved' : 'Need attention'}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${stats.openTickets > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
                  <Ticket className={`h-5 w-5 ${stats.openTickets > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
                </div>
              </div>
            </Card>
          </div>

          {/* Agent Performance Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Agent Performance</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chatbot Performance */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">Chatbots</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/chatbots')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Conversations</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Active</span>
                      <span className="font-medium">{stats.activeChatbots} / {stats.totalChatbots}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg msgs/conv</span>
                      <span className="font-medium">{stats.avgMessagesPerConversation}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice Performance */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-chart-5/10 rounded-lg">
                        <Phone className="h-4 w-4 text-chart-5" />
                      </div>
                      <span className="font-medium">Voice Assistants</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/voice-assistants')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{stats.totalVoiceCalls.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Calls</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{stats.totalCallMinutes}</p>
                      <p className="text-xs text-muted-foreground">Minutes</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Assistants</span>
                      <span className="font-medium">{stats.totalVoiceAssistants}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg duration</span>
                      <span className="font-medium">{formatDuration(stats.avgCallDuration)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Performance */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-500/10 rounded-lg">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <span className="font-medium">WhatsApp Agents</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/whatsapp-agents')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{stats.totalWhatsAppConversations.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Conversations</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold">{stats.totalWhatsAppMessages.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Active agents</span>
                      <span className="font-medium">{stats.activeWhatsAppAgents} / {stats.totalWhatsAppAgents}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Avg msgs/conv</span>
                      <span className="font-medium">
                        {stats.totalWhatsAppConversations > 0
                          ? Math.round(stats.totalWhatsAppMessages / stats.totalWhatsAppConversations)
                          : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Support Tickets & Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Support Tickets */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-yellow-500" />
                    <CardTitle className="text-base">Recent Support Tickets</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/support-tickets')}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No tickets</p>
                    <p className="text-xs mt-1">All customer issues resolved</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/support-tickets')}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{ticket.customer_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={getTicketPriorityColor(ticket.priority)} className="capitalize text-xs">
                            {ticket.priority}
                          </Badge>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getTicketStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentActivity.map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-1.5 bg-muted rounded-lg">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pending Content Reviews */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Customer Content Reviews</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Review and approve customer-submitted FAQs and content
              </p>
            </CardHeader>
            <CardContent>
              <PendingContentReview />
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          {upcomingTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-chart-3" />
                    <CardTitle className="text-base">Upcoming Tasks</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/voice-tasks')}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {upcomingTasks.map(task => {
                    const dueDateInfo = getDueDateLabel(task.due_date);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/voice-tasks')}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getStatusIcon(task.status)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {getAssistantName(task.assistant_id)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={getPriorityColor(task.priority)} className="capitalize text-xs">
                            {task.priority}
                          </Badge>
                          {dueDateInfo && (
                            <span className={`text-xs font-medium ${dueDateInfo.className}`}>
                              {dueDateInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
