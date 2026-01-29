import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { getCustomerPortalAnalytics, CustomerAnalyticsResponse } from '@/integrations/api/endpoints/customers';
import {
  BarChart3,
  MessageSquare,
  Phone,
  Clock,
  Bot,
  MessageCircle,
  Users,
  TrendingUp
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
    // If value is already a percentage (> 1), cap at 100
    // If value is decimal (0-1), multiply by 100
    const percentage = value > 1 ? Math.min(value, 100) : Math.min(value * 100, 100);
    return `${percentage.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
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
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance metrics for your AI agents
        </p>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-semibold mt-1">{analytics.leads.total_count}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-semibold mt-1">
                  {formatPercentage(analytics.leads.conversion_rates.overall)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Interactions</p>
                <p className="text-3xl font-semibold mt-1">{totalInteractions}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-3xl font-semibold mt-1">{totalAgents}</p>
              </CardContent>
            </Card>
          </div>

          {/* Channel Performance */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium">Performance by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Chatbots */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Chatbots</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversations</span>
                      <span className="font-medium">{analytics.chatbots.total_conversations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Messages</span>
                      <span className="font-medium">{analytics.chatbots.total_messages}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversion</span>
                      <span className="font-medium">{formatPercentage(analytics.leads.conversion_rates.chatbot)}</span>
                    </div>
                  </div>
                </div>

                {/* Voice */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Voice Assistants</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Calls</span>
                      <span className="font-medium">{analytics.voice_assistants.total_calls}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{formatDuration(analytics.voice_assistants.total_duration)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversion</span>
                      <span className="font-medium">{formatPercentage(analytics.leads.conversion_rates.voice)}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversations</span>
                      <span className="font-medium">{analytics.whatsapp_agents.total_conversations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Messages</span>
                      <span className="font-medium">{analytics.whatsapp_agents.total_messages}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversion</span>
                      <span className="font-medium">{formatPercentage(analytics.leads.conversion_rates.whatsapp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Details */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="chatbots">Chatbots</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              {/* Recent Leads */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium">Recent Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.leads.recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No leads captured yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.leads.recent.slice(0, 5).map((lead) => (
                        <div
                          key={lead.id}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {lead.name || lead.email || lead.phone_number || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lead.source_name || lead.source_type}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(lead.extracted_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chatbots" className="mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium">Chatbot Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.chatbots.assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No chatbots connected
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.chatbots.assigned.map((chatbot) => (
                        <div
                          key={chatbot.id}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{chatbot.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {chatbot.conversation_count} conversations
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{chatbot.message_count}</p>
                            <p className="text-xs text-muted-foreground">messages</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium">Voice Assistant Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.voice_assistants.assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No voice assistants connected
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.voice_assistants.assigned.map((assistant) => (
                        <div
                          key={assistant.id}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{assistant.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {assistant.phone_number || 'No phone'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{assistant.call_count} calls</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(assistant.total_duration)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium">WhatsApp Agent Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.whatsapp_agents.assigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No WhatsApp agents connected
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {analytics.whatsapp_agents.assigned.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between py-3 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                              <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{agent.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {agent.phone_number || 'No phone'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{agent.conversation_count}</p>
                            <p className="text-xs text-muted-foreground">conversations</p>
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
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No analytics available yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
