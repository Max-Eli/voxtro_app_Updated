import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { getCustomerPortalAnalytics, CustomerAnalyticsResponse } from '@/integrations/api/endpoints/customers';
import {
  BarChart3,
  MessageSquare,
  TrendingUp,
  Users,
  Phone,
  Clock,
  Bot,
  MessageCircle,
  Target,
  UserCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus
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

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getConversionColor = (rate: number) => {
    if (rate >= 0.3) return 'text-green-500';
    if (rate >= 0.15) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConversionBgColor = (rate: number) => {
    if (rate >= 0.3) return 'bg-green-500';
    if (rate >= 0.15) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  // Calculate totals
  const totalInteractions = (analytics?.chatbots.total_conversations || 0) +
                           (analytics?.voice_assistants.total_calls || 0) +
                           (analytics?.whatsapp_agents.total_conversations || 0);

  const totalAgents = (analytics?.chatbots.assigned.length || 0) +
                      (analytics?.voice_assistants.assigned.length || 0) +
                      (analytics?.whatsapp_agents.assigned.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Performance Analytics
        </h1>
        <p className="text-muted-foreground">
          Real-time insights and conversion metrics for your AI agents
        </p>
      </div>

      {analytics && (
        <>
          {/* Hero Metrics - Key Business KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Leads Generated */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.leads.total_count}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  From all agent interactions
                </p>
              </CardContent>
            </Card>

            {/* Overall Conversion Rate */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getConversionColor(analytics.leads.conversion_rates.overall)}`}>
                  {formatPercentage(analytics.leads.conversion_rates.overall)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Overall lead conversion
                </p>
              </CardContent>
            </Card>

            {/* Total Interactions */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                <Zap className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalInteractions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Conversations + Calls
                </p>
              </CardContent>
            </Card>

            {/* Active Agents */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                <Users className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalAgents}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Connected AI agents
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel by Channel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Conversion by Channel
              </CardTitle>
              <CardDescription>
                Lead conversion rates across different communication channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Chatbot Conversion */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Chatbots</span>
                    </div>
                    <span className={`text-lg font-bold ${getConversionColor(analytics.leads.conversion_rates.chatbot)}`}>
                      {formatPercentage(analytics.leads.conversion_rates.chatbot)}
                    </span>
                  </div>
                  <Progress
                    value={analytics.leads.conversion_rates.chatbot * 100}
                    className="h-3"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{analytics.chatbots.total_conversations} conversations</span>
                    <span>{analytics.chatbots.total_messages} messages</span>
                  </div>
                </div>

                {/* Voice Conversion */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Voice Calls</span>
                    </div>
                    <span className={`text-lg font-bold ${getConversionColor(analytics.leads.conversion_rates.voice)}`}>
                      {formatPercentage(analytics.leads.conversion_rates.voice)}
                    </span>
                  </div>
                  <Progress
                    value={analytics.leads.conversion_rates.voice * 100}
                    className="h-3"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{analytics.voice_assistants.total_calls} calls</span>
                    <span>{formatDuration(analytics.voice_assistants.total_duration)} total</span>
                  </div>
                </div>

                {/* WhatsApp Conversion */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium">WhatsApp</span>
                    </div>
                    <span className={`text-lg font-bold ${getConversionColor(analytics.leads.conversion_rates.whatsapp)}`}>
                      {formatPercentage(analytics.leads.conversion_rates.whatsapp)}
                    </span>
                  </div>
                  <Progress
                    value={analytics.leads.conversion_rates.whatsapp * 100}
                    className="h-3"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{analytics.whatsapp_agents.total_conversations} conversations</span>
                    <span>{analytics.whatsapp_agents.total_messages} messages</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Agent Performance */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="chatbots" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Chatbots
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Recent Leads */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Recent Leads
                  </CardTitle>
                  <CardDescription>
                    Latest leads captured by your AI agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.leads.recent.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No leads captured yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Leads will appear here as your agents interact with visitors
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analytics.leads.recent.slice(0, 5).map((lead) => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {lead.name || lead.email || lead.phone_number || 'Anonymous'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {lead.email && <span>{lead.email}</span>}
                                {lead.email && lead.phone_number && <span> • </span>}
                                {lead.phone_number && <span>{lead.phone_number}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="mb-1">
                              {lead.source_type === 'chatbot' && <Bot className="h-3 w-3 mr-1" />}
                              {lead.source_type === 'voice' && <Phone className="h-3 w-3 mr-1" />}
                              {lead.source_type === 'whatsapp' && <MessageCircle className="h-3 w-3 mr-1" />}
                              {lead.source_name || lead.source_type}
                            </Badge>
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

              {/* Agent Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chatbot Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bot className="h-5 w-5 text-blue-500" />
                      Chatbots
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{analytics.chatbots.assigned.length}</p>
                        <p className="text-xs text-muted-foreground">Agents</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{analytics.chatbots.total_conversations}</p>
                        <p className="text-xs text-muted-foreground">Conversations</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Avg messages/conv</span>
                      <span className="font-medium">{analytics.chatbots.avg_messages_per_conversation}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Voice Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="h-5 w-5 text-green-500" />
                      Voice Assistants
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{analytics.voice_assistants.assigned.length}</p>
                        <p className="text-xs text-muted-foreground">Assistants</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{analytics.voice_assistants.total_calls}</p>
                        <p className="text-xs text-muted-foreground">Calls</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total duration</span>
                        <span className="font-medium">{formatDuration(analytics.voice_assistants.total_duration)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Success rate</span>
                        <span className={`font-medium ${getConversionColor(analytics.voice_assistants.success_rate)}`}>
                          {formatPercentage(analytics.voice_assistants.success_rate)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageCircle className="h-5 w-5 text-emerald-500" />
                      WhatsApp Agents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{analytics.whatsapp_agents.assigned.length}</p>
                        <p className="text-xs text-muted-foreground">Agents</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{analytics.whatsapp_agents.total_conversations}</p>
                        <p className="text-xs text-muted-foreground">Conversations</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Total messages</span>
                      <span className="font-medium">{analytics.whatsapp_agents.total_messages}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Chatbots Tab */}
            <TabsContent value="chatbots" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Chatbot Performance
                  </CardTitle>
                  <CardDescription>
                    Individual performance metrics for each chatbot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.chatbots.assigned.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No chatbots connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.chatbots.assigned.map((chatbot) => (
                        <div
                          key={chatbot.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${chatbot.theme_color || '#3b82f6'}20` }}
                            >
                              <Bot className="h-6 w-6" style={{ color: chatbot.theme_color || '#3b82f6' }} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{chatbot.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {chatbot.description || 'AI Chatbot'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xl font-bold">{chatbot.conversation_count}</p>
                              <p className="text-xs text-muted-foreground">Conversations</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">{chatbot.message_count}</p>
                              <p className="text-xs text-muted-foreground">Messages</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">
                                {chatbot.conversation_count > 0
                                  ? Math.round(chatbot.message_count / chatbot.conversation_count)
                                  : 0}
                              </p>
                              <p className="text-xs text-muted-foreground">Avg/Conv</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Tab */}
            <TabsContent value="voice" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Voice Assistant Performance
                  </CardTitle>
                  <CardDescription>
                    Call statistics and performance by assistant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.voice_assistants.assigned.length === 0 ? (
                    <div className="text-center py-8">
                      <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No voice assistants connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.voice_assistants.assigned.map((assistant) => (
                        <div
                          key={assistant.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                              <Phone className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{assistant.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {assistant.phone_number || 'No phone number assigned'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xl font-bold">{assistant.call_count}</p>
                              <p className="text-xs text-muted-foreground">Calls</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">{formatDuration(assistant.total_duration)}</p>
                              <p className="text-xs text-muted-foreground">Total Time</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold">
                                {assistant.call_count > 0
                                  ? formatDuration(Math.round(assistant.total_duration / assistant.call_count))
                                  : '0m'}
                              </p>
                              <p className="text-xs text-muted-foreground">Avg Duration</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp Agent Performance
                  </CardTitle>
                  <CardDescription>
                    Conversation metrics for each WhatsApp agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.whatsapp_agents.assigned.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No WhatsApp agents connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.whatsapp_agents.assigned.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <MessageCircle className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{agent.name}</h4>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">
                                  {agent.phone_number || 'No phone number'}
                                </p>
                                {agent.status && (
                                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                    {agent.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xl font-bold">{agent.conversation_count}</p>
                              <p className="text-xs text-muted-foreground">Conversations</p>
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

      {/* Empty State */}
      {!analytics && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground">
              Analytics will appear here once your agents start receiving interactions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
