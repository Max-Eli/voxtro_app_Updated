import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
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
  Ticket
} from 'lucide-react';

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

      // Voice calls
      let totalVoiceCalls = 0;
      let avgCallDuration = 0;
      let totalCallMinutes = 0;

      if (assistantIds.length > 0) {
        const { data: calls, error: callsError } = await supabase
          .from('voice_assistant_calls')
          .select('duration_seconds, status')
          .in('assistant_id', assistantIds);

        if (callsError) throw callsError;

        totalVoiceCalls = calls?.length || 0;

        if (calls && calls.length > 0) {
          const callsWithDuration = calls.filter(c => c.duration_seconds != null && c.duration_seconds > 0);
          const totalDuration = callsWithDuration.reduce(
            (sum, call) => sum + (call.duration_seconds || 0),
            0
          );
          avgCallDuration = callsWithDuration.length > 0 ? Math.round(totalDuration / callsWithDuration.length) : 0;
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your AI agents and platform activity
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/chatbots')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chatbots</p>
                  <p className="text-xl font-bold">{stats.totalChatbots}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/voice-assistants')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-5/10 rounded-lg">
                  <Phone className="h-4 w-4 text-chart-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Voice Assistants</p>
                  <p className="text-xl font-bold">{stats.totalVoiceAssistants}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/whatsapp-agents')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="text-xl font-bold">{stats.totalWhatsAppAgents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/customers')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <Users className="h-4 w-4 text-chart-2" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customers</p>
                  <p className="text-xl font-bold">{stats.totalCustomers}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/support-tickets')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Ticket className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Tickets</p>
                  <p className="text-xl font-bold">{stats.openTickets}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/voice-tasks')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-chart-3" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Tasks</p>
                  <p className="text-xl font-bold">{upcomingTasks.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chatbot Analytics */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Chatbots</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/chatbots')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{stats.totalConversations}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{stats.totalMessages}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-medium">{stats.activeChatbots} / {stats.totalChatbots}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Avg msgs/conv</span>
                    <span className="font-medium">{stats.avgMessagesPerConversation}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Assistant Analytics */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-chart-5" />
                    <CardTitle className="text-base">Voice Assistants</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/voice-assistants')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{stats.totalVoiceCalls}</p>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{stats.totalCallMinutes}</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Assistants</span>
                    <span className="font-medium">{stats.totalVoiceAssistants}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Avg duration</span>
                    <span className="font-medium">{formatDuration(stats.avgCallDuration)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Analytics */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <CardTitle className="text-base">WhatsApp Agents</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/whatsapp-agents')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{stats.totalWhatsAppConversations}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{stats.totalWhatsAppMessages}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Active agents</span>
                    <span className="font-medium">{stats.activeWhatsAppAgents} / {stats.totalWhatsAppAgents}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
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

          {/* Bottom Row: Tasks and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Tasks */}
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
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No pending tasks</p>
                    <Button 
                      variant="link" 
                      size="sm"
                      onClick={() => navigate('/voice-tasks')}
                      className="mt-1"
                    >
                      Create a task
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
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
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/chatbots/new')}
                  >
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-xs">New Chatbot</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/conversations')}
                  >
                    <MessageSquare className="h-5 w-5 text-chart-2" />
                    <span className="text-xs">Conversations</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/customers')}
                  >
                    <Users className="h-5 w-5 text-chart-3" />
                    <span className="text-xs">Customers</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => navigate('/support-tickets')}
                  >
                    <Ticket className="h-5 w-5 text-yellow-500" />
                    <span className="text-xs">Support</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
