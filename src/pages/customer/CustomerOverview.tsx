import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CreateTicketDialog } from '@/components/customer/CreateTicketDialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  TrendingUp, 
  Bot,
  Activity,
  Phone,
  Clock,
  MessageCircle,
  Ticket,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Users,
  Target,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyAgentState } from '@/components/customer/EmptyAgentState';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
interface CustomerChatbot {
  id: string;
  name: string;
  description?: string;
  theme_color?: string;
  conversation_count: number;
  message_count: number;
  last_activity?: string;
}

interface CustomerAnalytics {
  total_conversations: number;
  total_messages: number;
  avg_conversation_length: number;
}

interface VoiceAssistantAnalytics {
  total_calls: number;
  total_duration: number;
  avg_duration: number;
  success_rate: number;
}

interface CustomerAssistant {
  id: string;
  assistant_id: string;
  voice_assistants: {
    id: string;
    name: string;
    first_message?: string;
    voice_provider?: string;
  };
  call_count?: number;
  total_duration?: number;
}

interface CustomerWhatsAppAgent {
  id: string;
  agent_id: string;
  whatsapp_agents: {
    id: string;
    name: string;
    phone_number?: string;
    status?: string;
  };
  conversation_count?: number;
  message_count?: number;
}

interface WhatsAppAnalytics {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  has_unread_replies: boolean;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  source_type: string;
  source_name: string | null;
  extracted_at: string;
}

interface ConversionRates {
  chatbot: number;
  voice: number;
  whatsapp: number;
  overall: number;
}

export function CustomerOverview() {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [chatbots, setChatbots] = useState<CustomerChatbot[]>([]);
  const [assistants, setAssistants] = useState<CustomerAssistant[]>([]);
  const [whatsappAgents, setWhatsappAgents] = useState<CustomerWhatsAppAgent[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [voiceAnalytics, setVoiceAnalytics] = useState<VoiceAssistantAnalytics | null>(null);
  const [whatsappAnalytics, setWhatsappAnalytics] = useState<WhatsAppAnalytics | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchCustomerData();
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    if (!customer) return;

    try {
      // Fetch assigned chatbots with basic stats
      const { data: assignments, error: assignmentsError } = await supabase
        .from('customer_chatbot_assignments')
        .select(`
          chatbot_id,
          chatbots (
            id,
            name,
            description,
            theme_color
          )
        `)
        .eq('customer_id', customer.id);

      if (assignmentsError) throw assignmentsError;

      // Fetch conversation counts for each chatbot
      const chatbotIds = assignments?.map(a => a.chatbot_id) || [];
      
      const { data: conversationCounts, error: convError } = await supabase
        .from('conversations')
        .select('chatbot_id')
        .in('chatbot_id', chatbotIds);

      const { data: messageCounts, error: msgError } = await supabase
        .from('messages')
        .select('conversation_id, conversations!inner(chatbot_id)')
        .in('conversations.chatbot_id', chatbotIds);

      if (convError || msgError) throw convError || msgError;

      // Process chatbot data
      const chatbotData = assignments?.map(assignment => {
        const chatbot = assignment.chatbots;
        const convCount = conversationCounts?.filter(c => c.chatbot_id === chatbot.id).length || 0;
        const msgCount = messageCounts?.filter(m => m.conversations?.chatbot_id === chatbot.id).length || 0;

        return {
          id: chatbot.id,
          name: chatbot.name,
          description: chatbot.description,
          theme_color: chatbot.theme_color,
          conversation_count: convCount,
          message_count: msgCount,
          last_activity: null
        };
      }) || [];

      setChatbots(chatbotData);

      // Calculate overall analytics
      const totalConversations = conversationCounts?.length || 0;
      const totalMessages = messageCounts?.length || 0;

      setAnalytics({
        total_conversations: totalConversations,
        total_messages: totalMessages,
        avg_conversation_length: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
      });

      // Fetch voice assistant assignments
      const { data: vaAssignments, error: vaError } = await supabase
        .from('customer_assistant_assignments')
        .select(`
          id,
          assistant_id,
          voice_assistants (
            id,
            name,
            first_message,
            voice_provider,
            phone_number
          )
        `)
        .eq('customer_id', customer.id);

      if (vaError) throw vaError;

      // Get assistant IDs for the customer's assigned assistants
      const assistantIdsForCalls = vaAssignments?.map(a => a.assistant_id).filter(Boolean) || [];

      // Fetch voice assistant call stats
      let calls = [];
      let callsError = null;

      if (assistantIdsForCalls.length > 0) {
        const { data, error } = await supabase
          .from('voice_assistant_calls')
          .select('assistant_id, phone_number, duration_seconds, ended_at, status')
          .in('assistant_id', assistantIdsForCalls);

        calls = data || [];
        callsError = error;
      }

      if (callsError) throw callsError;

      // Process voice assistant data
      const assistantData = vaAssignments?.map(assignment => {
        const assistant = assignment.voice_assistants;
        const assistantCalls = calls?.filter(c => 
          c.assistant_id === assignment.assistant_id || 
          (assistant.phone_number && c.phone_number === assistant.phone_number)
        ) || [];
        const callsWithDuration = assistantCalls.filter(c => c.duration_seconds != null && c.duration_seconds > 0);
        const totalDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

        return {
          ...assignment,
          call_count: assistantCalls.length,
          total_duration: totalDuration,
        };
      }) || [];

      setAssistants(assistantData);

      // Calculate voice analytics
      const totalCalls = calls?.length || 0;
      const callsWithDuration = calls?.filter(call => call.duration_seconds != null && call.duration_seconds > 0) || [];
      const totalVoiceDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const successfulCalls = callsWithDuration.length;
      const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

      setVoiceAnalytics({
        total_calls: totalCalls,
        total_duration: totalVoiceDuration,
        avg_duration: callsWithDuration.length > 0 ? Math.round(totalVoiceDuration / callsWithDuration.length) : 0,
        success_rate: successRate,
      });

      // Fetch WhatsApp agent assignments
      const { data: waAssignments, error: waAssignError } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select(`
          id,
          agent_id,
          whatsapp_agents (
            id,
            name,
            phone_number,
            status
          )
        `)
        .eq('customer_id', customer.id);

      if (waAssignError) throw waAssignError;

      // Get agent IDs for the customer's assigned agents
      const waAgentIds = waAssignments?.map(a => a.agent_id).filter(Boolean) || [];

      // Fetch WhatsApp conversations for assigned agents
      let waConversations: any[] = [];
      let totalWaMessages = 0;

      if (waAgentIds.length > 0) {
        const { data: convData, error: convError } = await supabase
          .from('whatsapp_conversations')
          .select('id, agent_id')
          .in('agent_id', waAgentIds);

        if (convError) throw convError;
        waConversations = convData || [];

        // Fetch WhatsApp messages
        const waConvIds = waConversations.map(c => c.id);
        if (waConvIds.length > 0) {
          const { count: msgCount, error: msgError } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', waConvIds);

          if (msgError) throw msgError;
          totalWaMessages = msgCount || 0;
        }
      }

      // Process WhatsApp agent data
      const waAgentData = waAssignments?.map(assignment => {
        const agent = assignment.whatsapp_agents;
        const agentConversations = waConversations.filter(c => c.agent_id === assignment.agent_id);
        
        return {
          ...assignment,
          conversation_count: agentConversations.length,
          message_count: 0,
        };
      }) || [];

      setWhatsappAgents(waAgentData);

      // Calculate WhatsApp analytics
      const totalWaConversations = waConversations.length;
      setWhatsappAnalytics({
        total_conversations: totalWaConversations,
        total_messages: totalWaMessages,
        avg_messages_per_conversation: totalWaConversations > 0 
          ? Math.round(totalWaMessages / totalWaConversations) 
          : 0,
      });

      // Fetch support tickets for this customer
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, subject, status, priority, created_at, updated_at')
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (ticketsError) throw ticketsError;

      // Check for unread replies
      const ticketIds = tickets?.map(t => t.id) || [];
      let ticketsWithReplies: SupportTicket[] = [];

      if (ticketIds.length > 0) {
        const { data: messages, error: messagesError } = await supabase
          .from('support_ticket_messages')
          .select('ticket_id, sender_type, created_at')
          .in('ticket_id', ticketIds)
          .eq('sender_type', 'admin')
          .order('created_at', { ascending: false });

        if (!messagesError) {
          ticketsWithReplies = tickets?.map(ticket => ({
            ...ticket,
            has_unread_replies: messages?.some(m => 
              m.ticket_id === ticket.id && 
              new Date(m.created_at) > new Date(ticket.updated_at)
            ) || false
          })) || [];
        } else {
          ticketsWithReplies = tickets?.map(t => ({ ...t, has_unread_replies: false })) || [];
        }
      } else {
        ticketsWithReplies = [];
      }

      setSupportTickets(ticketsWithReplies);

      // Fetch leads for this customer's assigned agents
      let allLeads: Lead[] = [];
      let chatbotLeadsTotal = 0;
      let voiceLeadsTotal = 0;
      let waLeadsTotal = 0;
      
      // Fetch chatbot leads (with correct source_type 'chatbot')
      if (chatbotIds.length > 0) {
        // Get total count for conversion rate
        const { count: chatbotCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('source_type', 'chatbot')
          .in('source_id', chatbotIds);
        
        chatbotLeadsTotal = chatbotCount || 0;

        // Get recent leads for display
        const { data: chatbotLeads, error: chatbotLeadsError } = await supabase
          .from('leads')
          .select('id, name, email, phone_number, source_type, source_name, extracted_at')
          .eq('source_type', 'chatbot')
          .in('source_id', chatbotIds)
          .order('extracted_at', { ascending: false })
          .limit(10);

        if (!chatbotLeadsError && chatbotLeads) {
          allLeads = [...allLeads, ...chatbotLeads];
        }
      }

      // Fetch voice assistant leads (with correct source_type 'voice')
      if (assistantIdsForCalls.length > 0) {
        // Get total count for conversion rate
        const { count: voiceCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('source_type', 'voice')
          .in('source_id', assistantIdsForCalls);
        
        voiceLeadsTotal = voiceCount || 0;

        // Get recent leads for display
        const { data: voiceLeads, error: voiceLeadsError } = await supabase
          .from('leads')
          .select('id, name, email, phone_number, source_type, source_name, extracted_at')
          .eq('source_type', 'voice')
          .in('source_id', assistantIdsForCalls)
          .order('extracted_at', { ascending: false })
          .limit(10);

        if (!voiceLeadsError && voiceLeads) {
          allLeads = [...allLeads, ...voiceLeads];
        }
      }

      // Fetch WhatsApp agent leads (with correct source_type 'whatsapp')
      if (waAgentIds.length > 0) {
        // Get total count for conversion rate
        const { count: waCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('source_type', 'whatsapp')
          .in('source_id', waAgentIds);
        
        waLeadsTotal = waCount || 0;

        // Get recent leads for display
        const { data: waLeads, error: waLeadsError } = await supabase
          .from('leads')
          .select('id, name, email, phone_number, source_type, source_name, extracted_at')
          .eq('source_type', 'whatsapp')
          .in('source_id', waAgentIds)
          .order('extracted_at', { ascending: false })
          .limit(10);

        if (!waLeadsError && waLeads) {
          allLeads = [...allLeads, ...waLeads];
        }
      }

      // Sort all leads by extracted_at and take top 5
      allLeads.sort((a, b) => new Date(b.extracted_at).getTime() - new Date(a.extracted_at).getTime());
      setLeads(allLeads.slice(0, 5));

      // Calculate conversion rates using TOTAL leads count (not limited)
      const chatbotConvRate = totalConversations > 0 
        ? Math.round((chatbotLeadsTotal / totalConversations) * 100) 
        : 0;
      const voiceConvRate = (calls?.length || 0) > 0 
        ? Math.round((voiceLeadsTotal / calls.length) * 100) 
        : 0;
      const waConvRate = totalWaConversations > 0 
        ? Math.round((waLeadsTotal / totalWaConversations) * 100) 
        : 0;

      const totalInteractions = totalConversations + (calls?.length || 0) + totalWaConversations;
      const totalLeadsCount = chatbotLeadsTotal + voiceLeadsTotal + waLeadsTotal;
      const overallConvRate = totalInteractions > 0 
        ? Math.round((totalLeadsCount / totalInteractions) * 100) 
        : 0;

      setConversionRates({
        chatbot: chatbotConvRate,
        voice: voiceConvRate,
        whatsapp: waConvRate,
        overall: overallConvRate,
      });

    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoadingData(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'closed': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const openTickets = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your AI agents and support activity
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chatbots</p>
              <p className="text-xl font-bold">{chatbots.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-5/10 rounded-lg">
              <Phone className="h-4 w-4 text-chart-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Voice Assistants</p>
              <p className="text-xl font-bold">{assistants.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <MessageCircle className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp Agents</p>
              <p className="text-xl font-bold">{whatsappAgents.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Ticket className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
              <p className="text-xl font-bold">{openTickets.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chatbot Analytics Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Chatbot Analytics</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {chatbots.length === 0 ? (
              <EmptyAgentState type="chatbot" compact />
            ) : (
              <div className="space-y-4">
                {/* Chatbot Stats Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{analytics?.total_conversations || 0}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{analytics?.total_messages || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{analytics?.avg_conversation_length || 0}</p>
                    <p className="text-xs text-muted-foreground">Avg/Conv</p>
                  </div>
                </div>
                {/* Chatbot List */}
                <div className="space-y-2">
                  {chatbots.map((chatbot) => (
                    <div 
                      key={chatbot.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: chatbot.theme_color || 'hsl(var(--primary))' }}
                        />
                        <div>
                          <p className="text-sm font-medium">{chatbot.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {chatbot.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{chatbot.conversation_count}</p>
                          <p className="text-xs text-muted-foreground">convos</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{chatbot.message_count}</p>
                          <p className="text-xs text-muted-foreground">msgs</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Tickets Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-base">Support Tickets</CardTitle>
              </div>
              {openTickets.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {openTickets.length} open
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {supportTickets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-3">No support tickets yet</p>
                <CreateTicketDialog
                  customerId={customer?.id || ''}
                  customerName={customer?.full_name || ''}
                  customerEmail={customer?.email || ''}
                  onTicketCreated={fetchCustomerData}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Ticket className="h-4 w-4 mr-2" />
                      Create Your First Ticket
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                {supportTickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {ticket.has_unread_replies && (
                            <CircleDot className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                          <p className="text-sm font-medium truncate">{ticket.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex-shrink-0 ${getStatusColor(ticket.status)}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads & Conversion Rates Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-chart-2" />
                <CardTitle className="text-base">Recent Leads</CardTitle>
              </div>
              {leads.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/customer/leads')}
                  className="text-xs"
                >
                  View All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leads captured yet</p>
                <p className="text-xs mt-1">Leads are automatically extracted from your conversations</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => (
                  <div 
                    key={lead.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-chart-2/10 rounded-full flex-shrink-0">
                        <Users className="h-3 w-3 text-chart-2" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.phone_number || lead.email || 'No contact info'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          lead.source_type === 'chatbot' 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : lead.source_type === 'voice'
                            ? 'bg-chart-5/10 text-chart-5 border-chart-5/20'
                            : 'bg-green-500/10 text-green-600 border-green-500/20'
                        }`}
                      >
                        {lead.source_type === 'chatbot' ? 'Chat' : 
                         lead.source_type === 'voice' ? 'Voice' : 'WhatsApp'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.extracted_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rates Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-chart-1" />
              <CardTitle className="text-base">Conversion Rates</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Conversion Rate */}
              <div className="text-center p-4 bg-chart-1/10 rounded-lg">
                <p className="text-3xl font-bold text-chart-1">{conversionRates?.overall || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Overall Conversion Rate</p>
              </div>

              {/* Per-Channel Rates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm">Chatbot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all" 
                        style={{ width: `${Math.min(conversionRates?.chatbot || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{conversionRates?.chatbot || 0}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-chart-5" />
                    <span className="text-sm">Voice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-chart-5 rounded-full transition-all" 
                        style={{ width: `${Math.min(conversionRates?.voice || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{conversionRates?.voice || 0}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all" 
                        style={{ width: `${Math.min(conversionRates?.whatsapp || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{conversionRates?.whatsapp || 0}%</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Based on leads captured vs total interactions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voice & WhatsApp Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Voice Assistants Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-chart-5" />
              <CardTitle className="text-base">Voice Assistants</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {assistants.length === 0 ? (
              <EmptyAgentState type="voice" compact />
            ) : (
              <div className="space-y-4">
                {/* Voice Stats Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{voiceAnalytics?.total_calls || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{formatDuration(voiceAnalytics?.avg_duration || 0)}</p>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                  </div>
                </div>
                {/* Assistant List */}
                <div className="space-y-2">
                  {assistants.map((assistant) => (
                    <div 
                      key={assistant.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{assistant.voice_assistants.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assistant.call_count || 0} calls • {formatDuration(assistant.total_duration || 0)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Voice Assistant
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Agents Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <CardTitle className="text-base">WhatsApp Agents</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {whatsappAgents.length === 0 ? (
              <EmptyAgentState type="whatsapp" compact />
            ) : (
              <div className="space-y-4">
                {/* WhatsApp Stats Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{whatsappAnalytics?.total_conversations || 0}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-bold">{whatsappAnalytics?.total_messages || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                </div>
                {/* Agent List */}
                <div className="space-y-2">
                  {whatsappAgents.map((agent) => (
                    <div 
                      key={agent.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{agent.whatsapp_agents.name || 'Unnamed Agent'}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.whatsapp_agents.phone_number || 'No phone'} • {agent.conversation_count || 0} convos
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs capitalize ${
                          agent.whatsapp_agents.status === 'active' 
                            ? 'bg-green-500/10 text-green-600' 
                            : ''
                        }`}
                      >
                        {agent.whatsapp_agents.status || 'Unknown'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
