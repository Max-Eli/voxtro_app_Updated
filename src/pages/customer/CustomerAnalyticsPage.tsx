import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { getCustomerPortalAnalytics, CustomerAnalyticsResponse } from '@/integrations/api/endpoints/customers';
import {
  BarChart3,
  Phone,
  Clock,
  Bot,
  MessageCircle,
  Users,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export function CustomerAnalyticsPage() {
  const { customer } = useCustomerAuth();
  const [analytics, setAnalytics] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (customer) {
      fetchAnalytics();
    }
  }, [customer]);

  const fetchAnalytics = async () => {
    try {
      const data = await getCustomerPortalAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format percentage - cap at 100% and handle edge cases
  const formatPercentage = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    const percentage = value > 1 ? Math.min(value, 100) : Math.min(value * 100, 100);
    return `${percentage.toFixed(0)}%`;
  };


  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-muted/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  const totalInteractions = (analytics?.chatbots.total_conversations || 0) +
                           (analytics?.voice_assistants.total_calls || 0) +
                           (analytics?.whatsapp_agents.total_conversations || 0);

  const totalAgents = (analytics?.chatbots.assigned.length || 0) +
                      (analytics?.voice_assistants.assigned.length || 0) +
                      (analytics?.whatsapp_agents.assigned.length || 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track performance across all your AI agents
          </p>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                    <p className="text-3xl font-bold mt-2">{analytics.leads.total_count}</p>
                    <p className="text-xs text-muted-foreground mt-1">Captured from agents</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <p className="text-3xl font-bold mt-2">
                      {formatPercentage(analytics.leads.conversion_rates.overall)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Lead conversion</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Interactions</p>
                    <p className="text-3xl font-bold mt-2">{totalInteractions}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total conversations & calls</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                    <p className="text-3xl font-bold mt-2">{totalAgents}</p>
                    <p className="text-xs text-muted-foreground mt-1">Connected agents</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Chatbots */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Chatbots</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Conversion</span>
                      <span className="text-2xl font-semibold">{formatPercentage(analytics.leads.conversion_rates.chatbot)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversations</span>
                      <span>{analytics.chatbots.total_conversations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Messages</span>
                      <span>{analytics.chatbots.total_messages}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Voice</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Conversion</span>
                      <span className="text-2xl font-semibold">{formatPercentage(analytics.leads.conversion_rates.voice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Calls</span>
                      <span>{analytics.voice_assistants.total_calls}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{formatDuration(analytics.voice_assistants.total_duration)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <span className="font-medium">WhatsApp</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Conversion</span>
                      <span className="text-2xl font-semibold">{formatPercentage(analytics.leads.conversion_rates.whatsapp)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversations</span>
                      <span>{analytics.whatsapp_agents.total_conversations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Messages</span>
                      <span>{analytics.whatsapp_agents.total_messages}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Details */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Recent Leads</TabsTrigger>
              <TabsTrigger value="chatbots">Chatbots</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Leads</CardTitle>
                  <CardDescription>Latest leads captured by your AI agents</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.leads.recent.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No leads captured yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Leads will appear here as your agents interact with visitors
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {analytics.leads.recent.slice(0, 6).map((lead, index) => (
                        <div
                          key={lead.id}
                          className={`flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors ${
                            index !== analytics.leads.recent.slice(0, 6).length - 1 ? 'border-b' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {(lead.name || lead.email || '?')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {lead.name || lead.email || lead.phone_number || 'Anonymous'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {lead.email && lead.phone_number
                                  ? `${lead.email} · ${lead.phone_number}`
                                  : lead.email || lead.phone_number || 'No contact info'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{lead.source_name || lead.source_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(lead.extracted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chatbots" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chatbot Performance</CardTitle>
                  <CardDescription>Individual metrics for each chatbot</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.chatbots.assigned.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No chatbots connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.chatbots.assigned.map((chatbot) => (
                        <div
                          key={chatbot.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="h-12 w-12 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: chatbot.theme_color ? `${chatbot.theme_color}15` : 'hsl(var(--muted))'
                              }}
                            >
                              <Bot
                                className="h-6 w-6"
                                style={{ color: chatbot.theme_color || 'hsl(var(--foreground))' }}
                              />
                            </div>
                            <div>
                              <p className="font-medium">{chatbot.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {chatbot.description || 'AI Chatbot'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-xl font-bold">{chatbot.conversation_count}</p>
                              <p className="text-xs text-muted-foreground">conversations</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">{chatbot.message_count}</p>
                              <p className="text-xs text-muted-foreground">messages</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">
                                {chatbot.conversation_count > 0
                                  ? Math.round(chatbot.message_count / chatbot.conversation_count)
                                  : 0}
                              </p>
                              <p className="text-xs text-muted-foreground">avg/conv</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Voice Assistant Performance</CardTitle>
                  <CardDescription>Call statistics for each assistant</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.voice_assistants.assigned.length === 0 ? (
                    <div className="text-center py-12">
                      <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No voice assistants connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.voice_assistants.assigned.map((assistant) => (
                        <div
                          key={assistant.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <Phone className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{assistant.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {assistant.phone_number || 'No phone assigned'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-xl font-bold">{assistant.call_count}</p>
                              <p className="text-xs text-muted-foreground">calls</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">{formatDuration(assistant.total_duration)}</p>
                              <p className="text-xs text-muted-foreground">total time</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">
                                {assistant.call_count > 0
                                  ? formatDuration(Math.round(assistant.total_duration / assistant.call_count))
                                  : '0m'}
                              </p>
                              <p className="text-xs text-muted-foreground">avg call</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">WhatsApp Agent Performance</CardTitle>
                  <CardDescription>Conversation metrics for each agent</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.whatsapp_agents.assigned.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No WhatsApp agents connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.whatsapp_agents.assigned.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <MessageCircle className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {agent.phone_number || 'No phone assigned'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-xl font-bold">{agent.conversation_count}</p>
                              <p className="text-xs text-muted-foreground">conversations</p>
                            </div>
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

      {!analytics && !loading && (
        <Card>
          <CardContent className="text-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground">
              Analytics will appear here once your agents start receiving interactions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
