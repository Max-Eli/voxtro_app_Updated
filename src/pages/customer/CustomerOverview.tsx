import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CreateTicketDialog } from '@/components/customer/CreateTicketDialog';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Phone, MessageCircle, Ticket, Users, ArrowRight, TrendingUp, Mail, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyAgentState } from '@/components/customer/EmptyAgentState';
import { useNavigate } from 'react-router-dom';
import { getCustomerPortalLeads, CustomerLead } from '@/integrations/api/endpoints';
import { format } from 'date-fns';

interface CustomerChatbot {
  id: string;
  name: string;
  description?: string;
  theme_color?: string;
  conversation_count: number;
  message_count: number;
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
}

interface CustomerAssistant {
  id: string;
  assistant_id: string;
  voice_assistants: {
    id: string;
    name: string;
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
}

interface WhatsAppAnalytics {
  total_conversations: number;
  total_messages: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at: string;
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
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [conversionRates, setConversionRates] = useState<ConversionRates | null>(null);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchCustomerData();
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    if (!customer) return;

    try {
      // Fetch assigned chatbots
      const { data: assignments, error: assignmentsError } = await supabase
        .from('customer_chatbot_assignments')
        .select(`chatbot_id, chatbots (id, name, description, theme_color)`)
        .eq('customer_id', customer.id);

      if (assignmentsError) throw assignmentsError;

      const chatbotIds = assignments?.map(a => a.chatbot_id) || [];

      const { data: conversationCounts } = await supabase
        .from('conversations')
        .select('chatbot_id')
        .in('chatbot_id', chatbotIds);

      const { data: messageCounts } = await supabase
        .from('messages')
        .select('conversation_id, conversations!inner(chatbot_id)')
        .in('conversations.chatbot_id', chatbotIds);

      const chatbotData = assignments?.map(assignment => {
        const chatbot = assignment.chatbots;
        return {
          id: chatbot.id,
          name: chatbot.name,
          description: chatbot.description,
          theme_color: chatbot.theme_color,
          conversation_count: conversationCounts?.filter(c => c.chatbot_id === chatbot.id).length || 0,
          message_count: messageCounts?.filter(m => m.conversations?.chatbot_id === chatbot.id).length || 0,
        };
      }) || [];

      setChatbots(chatbotData);

      const totalConversations = conversationCounts?.length || 0;
      const totalMessages = messageCounts?.length || 0;

      setAnalytics({
        total_conversations: totalConversations,
        total_messages: totalMessages,
        avg_conversation_length: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
      });

      // Fetch voice assistants
      const { data: vaAssignments } = await supabase
        .from('customer_assistant_assignments')
        .select(`id, assistant_id, voice_assistants (id, name, phone_number)`)
        .eq('customer_id', customer.id);

      const assistantIds = vaAssignments?.map(a => a.assistant_id).filter(Boolean) || [];

      let calls: any[] = [];
      if (assistantIds.length > 0) {
        const { data } = await supabase
          .from('voice_assistant_calls')
          .select('assistant_id, duration_seconds')
          .in('assistant_id', assistantIds);
        calls = data || [];
      }

      const assistantData = vaAssignments?.map(assignment => {
        const assistantCalls = calls.filter(c => c.assistant_id === assignment.assistant_id);
        const totalDuration = assistantCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
        return {
          ...assignment,
          call_count: assistantCalls.length,
          total_duration: totalDuration,
        };
      }) || [];

      setAssistants(assistantData);

      const totalCalls = calls.length;
      const totalVoiceDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

      setVoiceAnalytics({
        total_calls: totalCalls,
        total_duration: totalVoiceDuration,
        avg_duration: totalCalls > 0 ? Math.round(totalVoiceDuration / totalCalls) : 0,
      });

      // Fetch WhatsApp agents
      const { data: waAssignments } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select(`id, agent_id, whatsapp_agents (id, name, phone_number, status)`)
        .eq('customer_id', customer.id);

      const waAgentIds = waAssignments?.map(a => a.agent_id).filter(Boolean) || [];

      let waConversations: any[] = [];
      let totalWaMessages = 0;

      if (waAgentIds.length > 0) {
        const { data: convData } = await supabase
          .from('whatsapp_conversations')
          .select('id, agent_id')
          .in('agent_id', waAgentIds);
        waConversations = convData || [];

        if (waConversations.length > 0) {
          const { count } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', waConversations.map(c => c.id));
          totalWaMessages = count || 0;
        }
      }

      const waAgentData = waAssignments?.map(assignment => ({
        ...assignment,
        conversation_count: waConversations.filter(c => c.agent_id === assignment.agent_id).length,
      })) || [];

      setWhatsappAgents(waAgentData);
      setWhatsappAnalytics({
        total_conversations: waConversations.length,
        total_messages: totalWaMessages,
      });

      // Fetch support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, subject, status, priority, created_at, updated_at')
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      setSupportTickets(tickets || []);

      // Fetch leads using API
      try {
        const leadsResponse = await getCustomerPortalLeads();
        const allLeads = leadsResponse.leads || [];
        setLeads(allLeads.slice(0, 5));
        setTotalLeadsCount(allLeads.length);

        // Calculate conversion rates
        const chatbotLeads = allLeads.filter(l => l.source_type === 'chatbot').length;
        const voiceLeads = allLeads.filter(l => l.source_type === 'voice').length;
        const waLeads = allLeads.filter(l => l.source_type === 'whatsapp').length;

        const chatbotConvRate = totalConversations > 0 ? Math.round((chatbotLeads / totalConversations) * 100) : 0;
        const voiceConvRate = totalCalls > 0 ? Math.round((voiceLeads / totalCalls) * 100) : 0;
        const waConvRate = waConversations.length > 0 ? Math.round((waLeads / waConversations.length) * 100) : 0;

        const totalInteractions = totalConversations + totalCalls + waConversations.length;
        const totalLeads = allLeads.length;
        const overallConvRate = totalInteractions > 0 ? Math.round((totalLeads / totalInteractions) * 100) : 0;

        setConversionRates({
          chatbot: chatbotConvRate,
          voice: voiceConvRate,
          whatsapp: waConvRate,
          overall: overallConvRate,
        });
      } catch (e) {
        console.error('Error fetching leads:', e);
        setLeads([]);
        setTotalLeadsCount(0);
        setConversionRates({ chatbot: 0, voice: 0, whatsapp: 0, overall: 0 });
      }

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
      case 'open': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'closed': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'chatbot': return <Bot className="h-3 w-3" />;
      case 'voice': return <PhoneCall className="h-3 w-3" />;
      case 'whatsapp': return <MessageCircle className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  if (loadingData) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-64 bg-muted/50 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const openTickets = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const totalInteractions = (analytics?.total_conversations || 0) + (voiceAnalytics?.total_calls || 0) + (whatsappAnalytics?.total_conversations || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{customer?.full_name ? `, ${customer.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here's an overview of your AI agents performance
          </p>
        </div>
        <CreateTicketDialog
          customerId={customer?.id || ''}
          customerName={customer?.full_name || ''}
          customerEmail={customer?.email || ''}
          onTicketCreated={fetchCustomerData}
          trigger={
            <Button variant="outline" size="sm">
              <Ticket className="h-4 w-4 mr-2" />
              New Support Ticket
            </Button>
          }
        />
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Conversion Rate */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversion Rate</p>
                <p className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {conversionRates?.overall || 0}%
                </p>
              </div>
              <div className="p-2.5 rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalLeadsCount} leads from {totalInteractions} interactions
            </p>
          </CardContent>
        </Card>

        {/* Total Leads */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
                <p className="text-3xl font-bold mt-1">{totalLeadsCount}</p>
              </div>
              <div className="p-2.5 rounded-full bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Captured across all channels</p>
          </CardContent>
        </Card>

        {/* Total Interactions */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-violet-500/5" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interactions</p>
                <p className="text-3xl font-bold mt-1">{totalInteractions}</p>
              </div>
              <div className="p-2.5 rounded-full bg-violet-500/10">
                <MessageCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Chats, calls & messages
            </p>
          </CardContent>
        </Card>

        {/* Open Tickets */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/5" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open Tickets</p>
                <p className="text-3xl font-bold mt-1">{openTickets.length}</p>
              </div>
              <div className="p-2.5 rounded-full bg-amber-500/10">
                <Ticket className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {supportTickets.length} total tickets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Latest contacts captured by your AI agents</p>
            </div>
            {leads.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/leads')} className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="p-3 rounded-full bg-muted/50 mb-3">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No leads captured yet</p>
                <p className="text-xs text-muted-foreground mt-1">Leads will appear here as your AI agents capture contact information</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {(lead.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name || 'Unknown'}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {lead.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize flex items-center gap-1">
                        {getSourceIcon(lead.source_type)}
                        {lead.source_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Support Tickets</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your recent requests</p>
            </div>
            {supportTickets.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/support-tickets')} className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {supportTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-muted/50 mb-3">
                  <Ticket className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No tickets yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Need help? Create a support ticket</p>
              </div>
            ) : (
              <div className="space-y-2">
                {supportTickets.slice(0, 4).map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate('/customer-dashboard/support-tickets')}
                    className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate flex-1">{ticket.subject}</p>
                      <Badge className={`text-[10px] shrink-0 ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {format(new Date(ticket.updated_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agents Performance Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your AI Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chatbots Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Chatbots</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/conversations')} className="text-xs h-7 px-2">
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chatbots.length === 0 ? (
                <EmptyAgentState type="chatbot" compact />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{analytics?.total_conversations || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conversations</p>
                    </div>
                    <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{conversionRates?.chatbot || 0}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conversion</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {chatbots.slice(0, 3).map((chatbot) => (
                      <div key={chatbot.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chatbot.theme_color || 'hsl(var(--primary))' }} />
                          <span className="text-xs font-medium truncate">{chatbot.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{chatbot.conversation_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Assistants Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Phone className="h-4 w-4 text-violet-500" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Voice Assistants</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/voice-assistants')} className="text-xs h-7 px-2">
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assistants.length === 0 ? (
                <EmptyAgentState type="voice" compact />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{voiceAnalytics?.total_calls || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Calls</p>
                    </div>
                    <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{formatDuration(voiceAnalytics?.avg_duration || 0)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Duration</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {assistants.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-medium truncate">{a.voice_assistants.name}</span>
                        <span className="text-xs text-muted-foreground">{a.call_count} calls</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp Agents Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <CardTitle className="text-sm font-semibold">WhatsApp Agents</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/whatsapp-agents')} className="text-xs h-7 px-2">
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {whatsappAgents.length === 0 ? (
                <EmptyAgentState type="whatsapp" compact />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{whatsappAnalytics?.total_conversations || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Conversations</p>
                    </div>
                    <div className="text-center p-2.5 bg-muted/50 rounded-lg">
                      <p className="text-lg font-semibold">{whatsappAnalytics?.total_messages || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Messages</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {whatsappAgents.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-medium truncate">{a.whatsapp_agents.name}</span>
                        <span className="text-xs text-muted-foreground">{a.conversation_count} chats</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
