import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CreateTicketDialog } from '@/components/customer/CreateTicketDialog';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Phone, MessageCircle, Ticket, Users, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyAgentState } from '@/components/customer/EmptyAgentState';
import { useNavigate } from 'react-router-dom';
import { getCustomerPortalLeads, CustomerLead } from '@/integrations/api/endpoints';

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
        .select('id, subject, status, created_at, updated_at')
        .eq('customer_id', customer.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      setSupportTickets(tickets || []);

      // Fetch leads using API (same as leads page)
      try {
        const leadsResponse = await getCustomerPortalLeads();
        const allLeads = leadsResponse.leads || [];
        setLeads(allLeads.slice(0, 5));

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
      case 'open': return 'bg-yellow-500/10 text-yellow-600';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600';
      case 'resolved': return 'bg-green-500/10 text-green-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loadingData) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const openTickets = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your AI agents</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{chatbots.length}</p>
              <p className="text-xs text-muted-foreground">Chatbots</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-violet-500/10">
              <Phone className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{assistants.length}</p>
              <p className="text-xs text-muted-foreground">Voice</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-500/10">
              <MessageCircle className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{whatsappAgents.length}</p>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-orange-500/10">
              <Ticket className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{openTickets.length}</p>
              <p className="text-xs text-muted-foreground">Open Tickets</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chatbot Analytics */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Chatbot Analytics</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/conversations')} className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {chatbots.length === 0 ? (
              <EmptyAgentState type="chatbot" compact />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{analytics?.total_conversations || 0}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{analytics?.total_messages || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{conversionRates?.chatbot || 0}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {chatbots.map((chatbot) => (
                    <div key={chatbot.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chatbot.theme_color || 'hsl(var(--primary))' }} />
                        <span className="text-sm font-medium">{chatbot.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{chatbot.conversation_count} convos</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Recent Leads</CardTitle>
            {leads.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/customer-dashboard/leads')} className="text-xs">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No leads yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(lead.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{lead.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.email || lead.phone_number}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{lead.source_type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Voice Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Voice Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {assistants.length === 0 ? (
              <EmptyAgentState type="voice" compact />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{voiceAnalytics?.total_calls || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{formatDuration(voiceAnalytics?.avg_duration || 0)}</p>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {assistants.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{a.voice_assistants.name}</span>
                      <span className="text-muted-foreground">{a.call_count} calls</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            {whatsappAgents.length === 0 ? (
              <EmptyAgentState type="whatsapp" compact />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{whatsappAnalytics?.total_conversations || 0}</p>
                    <p className="text-xs text-muted-foreground">Conversations</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xl font-semibold">{whatsappAnalytics?.total_messages || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {whatsappAgents.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{a.whatsapp_agents.name}</span>
                      <span className="text-muted-foreground">{a.conversation_count} chats</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Tickets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Support</CardTitle>
          </CardHeader>
          <CardContent>
            {supportTickets.length === 0 ? (
              <div className="text-center py-6">
                <Ticket className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No tickets yet</p>
                <CreateTicketDialog
                  customerId={customer?.id || ''}
                  customerName={customer?.full_name || ''}
                  customerEmail={customer?.email || ''}
                  onTicketCreated={fetchCustomerData}
                  trigger={<Button size="sm" variant="outline">Create Ticket</Button>}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {supportTickets.slice(0, 4).map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between gap-2">
                    <p className="text-sm truncate">{ticket.subject}</p>
                    <Badge className={`text-xs shrink-0 ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate Summary */}
      {(conversionRates?.overall || 0) > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overall Conversion Rate</p>
              <p className="text-xs text-muted-foreground">Leads captured from all interactions</p>
            </div>
            <p className="text-3xl font-bold">{conversionRates?.overall || 0}%</p>
          </div>
        </Card>
      )}
    </div>
  );
}
