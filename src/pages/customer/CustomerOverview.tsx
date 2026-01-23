import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CreateTicketDialog } from '@/components/customer/CreateTicketDialog';
import {
  MessageSquare,
  Bot,
  Phone,
  MessageCircle,
  Ticket,
  Users,
  Target,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getCustomerPortalAnalytics, CustomerAnalyticsResponse } from '@/integrations/api/endpoints';

export function CustomerOverview() {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchAnalytics();
    }
  }, [customer]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getCustomerPortalAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Unable to load dashboard data</p>
      </div>
    );
  }

  const hasChatbots = analytics.chatbots.assigned.length > 0;
  const hasVoice = analytics.voice_assistants.assigned.length > 0;
  const hasWhatsApp = analytics.whatsapp_agents.assigned.length > 0;
  const hasAnyAgent = hasChatbots || hasVoice || hasWhatsApp;

  // Calculate total interactions for the quick stats
  const totalInteractions =
    analytics.chatbots.total_conversations +
    analytics.voice_assistants.total_calls +
    analytics.whatsapp_agents.total_conversations;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your AI agents and activity
        </p>
      </div>

      {/* Quick Stats - Only show relevant ones */}
      <div className={`grid gap-4 ${
        hasAnyAgent
          ? 'grid-cols-2 md:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-2'
      }`}>
        {hasChatbots && (
          <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chatbot Conversations</p>
                <p className="text-2xl font-bold">{analytics.chatbots.total_conversations}</p>
              </div>
            </div>
          </Card>
        )}

        {hasVoice && (
          <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-violet-500/5 to-violet-500/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-xl">
                <Phone className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Voice Calls</p>
                <p className="text-2xl font-bold">{analytics.voice_assistants.total_calls}</p>
              </div>
            </div>
          </Card>
        )}

        {hasWhatsApp && (
          <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-green-500/5 to-green-500/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp Chats</p>
                <p className="text-2xl font-bold">{analytics.whatsapp_agents.total_conversations}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-2xl font-bold">{analytics.leads.total_count}</p>
            </div>
          </div>
        </Card>

        {!hasAnyAgent && (
          <Card className="p-5 border-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Ticket className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
                <p className="text-2xl font-bold">{analytics.support_tickets.open_count}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* No Agents State */}
      {!hasAnyAgent && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Agents Assigned</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              You don't have any AI agents assigned yet. Contact your administrator to get access to chatbots, voice assistants, or WhatsApp agents.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Only show sections for assigned agents */}
      {hasAnyAgent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Analytics - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chatbot Section */}
            {hasChatbots && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Chatbots</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {analytics.chatbots.assigned.length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.chatbots.total_conversations}</p>
                      <p className="text-xs text-muted-foreground">Conversations</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.chatbots.total_messages}</p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.chatbots.avg_messages_per_conversation}</p>
                      <p className="text-xs text-muted-foreground">Avg/Conv</p>
                    </div>
                  </div>
                  {/* Chatbot List */}
                  <div className="space-y-2">
                    {analytics.chatbots.assigned.map((chatbot) => (
                      <div
                        key={chatbot.id}
                        className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: chatbot.theme_color || 'hsl(var(--primary))' }}
                          />
                          <div>
                            <p className="font-medium">{chatbot.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {chatbot.description || 'AI Chatbot'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-semibold">{chatbot.conversation_count}</p>
                            <p className="text-xs text-muted-foreground">convos</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{chatbot.message_count}</p>
                            <p className="text-xs text-muted-foreground">msgs</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voice Assistant Section */}
            {hasVoice && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/10 rounded-lg">
                        <Phone className="h-4 w-4 text-violet-500" />
                      </div>
                      <CardTitle className="text-lg">Voice Assistants</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {analytics.voice_assistants.assigned.length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.voice_assistants.total_calls}</p>
                      <p className="text-xs text-muted-foreground">Total Calls</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{formatDuration(analytics.voice_assistants.avg_duration)}</p>
                      <p className="text-xs text-muted-foreground">Avg Duration</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.voice_assistants.success_rate}%</p>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </div>
                  </div>
                  {/* Assistant List */}
                  <div className="space-y-2">
                    {analytics.voice_assistants.assigned.map((assistant) => (
                      <div
                        key={assistant.id}
                        className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-500/10 rounded-lg">
                            <Phone className="h-4 w-4 text-violet-500" />
                          </div>
                          <div>
                            <p className="font-medium">{assistant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {assistant.phone_number || 'Voice Assistant'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-semibold">{assistant.call_count}</p>
                            <p className="text-xs text-muted-foreground">calls</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatDuration(assistant.total_duration)}</p>
                            <p className="text-xs text-muted-foreground">total</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* WhatsApp Section */}
            {hasWhatsApp && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <CardTitle className="text-lg">WhatsApp Agents</CardTitle>
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {analytics.whatsapp_agents.assigned.length} active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.whatsapp_agents.total_conversations}</p>
                      <p className="text-xs text-muted-foreground">Conversations</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <p className="text-2xl font-bold">{analytics.whatsapp_agents.total_messages}</p>
                      <p className="text-xs text-muted-foreground">Messages</p>
                    </div>
                  </div>
                  {/* Agent List */}
                  <div className="space-y-2">
                    {analytics.whatsapp_agents.assigned.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <MessageCircle className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">{agent.name || 'WhatsApp Agent'}</p>
                            <p className="text-xs text-muted-foreground">
                              {agent.phone_number || 'No phone'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="font-semibold">{agent.conversation_count}</p>
                            <p className="text-xs text-muted-foreground">convos</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              agent.status === 'active'
                                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                : ''
                            }`}
                          >
                            {agent.status || 'unknown'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Conversion Rates */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Target className="h-4 w-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-lg">Conversion Rates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Rate */}
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl text-center">
                  <p className="text-4xl font-bold text-amber-600">{analytics.leads.conversion_rates.overall}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Overall Rate</p>
                </div>

                {/* Per-Channel Rates - Only show for assigned agents */}
                <div className="space-y-3">
                  {hasChatbots && (
                    <div className="flex items-center justify-between p-3 border rounded-xl">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="text-sm">Chatbot</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(analytics.leads.conversion_rates.chatbot, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">
                          {analytics.leads.conversion_rates.chatbot}%
                        </span>
                      </div>
                    </div>
                  )}

                  {hasVoice && (
                    <div className="flex items-center justify-between p-3 border rounded-xl">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-violet-500" />
                        <span className="text-sm">Voice</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${Math.min(analytics.leads.conversion_rates.voice, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">
                          {analytics.leads.conversion_rates.voice}%
                        </span>
                      </div>
                    </div>
                  )}

                  {hasWhatsApp && (
                    <div className="flex items-center justify-between p-3 border rounded-xl">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">WhatsApp</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.min(analytics.leads.conversion_rates.whatsapp, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">
                          {analytics.leads.conversion_rates.whatsapp}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Leads */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <CardTitle className="text-lg">Recent Leads</CardTitle>
                  </div>
                  {analytics.leads.recent.length > 0 && (
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
                {analytics.leads.recent.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No leads yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analytics.leads.recent.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lead.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.phone_number || lead.email || 'No contact'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${
                            lead.source_type === 'chatbot'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : lead.source_type === 'voice'
                              ? 'bg-violet-500/10 text-violet-500 border-violet-500/20'
                              : 'bg-green-500/10 text-green-600 border-green-500/20'
                          }`}
                        >
                          {lead.source_type === 'chatbot' ? 'Chat' :
                           lead.source_type === 'voice' ? 'Voice' : 'WA'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support Tickets */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Ticket className="h-4 w-4 text-yellow-500" />
                    </div>
                    <CardTitle className="text-lg">Support</CardTitle>
                  </div>
                  {analytics.support_tickets.open_count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {analytics.support_tickets.open_count} open
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {analytics.support_tickets.recent.length === 0 ? (
                  <div className="text-center py-6">
                    <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mb-3">No tickets yet</p>
                    <CreateTicketDialog
                      customerId={customer?.id || ''}
                      customerName={customer?.full_name || ''}
                      customerEmail={customer?.email || ''}
                      onTicketCreated={fetchAnalytics}
                      trigger={
                        <Button size="sm" variant="outline">
                          Create Ticket
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analytics.support_tickets.recent.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="p-3 border rounded-xl hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground">
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
        </div>
      )}
    </div>
  );
}
