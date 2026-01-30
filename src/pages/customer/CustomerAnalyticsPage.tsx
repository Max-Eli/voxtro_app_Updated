import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import {
  getCustomerPortalAnalytics,
  CustomerAnalyticsResponse,
  getCustomerChatbotConversations,
  getCustomerVoiceCallLogs,
  getCustomerWhatsAppConversationLogs,
  ChatbotConversationLog,
  VoiceCallLog,
  WhatsAppConversationLog
} from '@/integrations/api/endpoints/customers';
import {
  BarChart3,
  Phone,
  Clock,
  Bot,
  MessageCircle,
  Users,
  TrendingUp,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  Smile,
  Frown,
  Meh,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export function CustomerAnalyticsPage() {
  const { customer } = useCustomerAuth();
  const [analytics, setAnalytics] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Conversation logs state
  const [chatbotLogs, setChatbotLogs] = useState<ChatbotConversationLog[]>([]);
  const [voiceLogs, setVoiceLogs] = useState<VoiceCallLog[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppConversationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<{chatbot: boolean; voice: boolean; whatsapp: boolean}>({
    chatbot: false, voice: false, whatsapp: false
  });
  const [logsLoaded, setLogsLoaded] = useState<{chatbot: boolean; voice: boolean; whatsapp: boolean}>({
    chatbot: false, voice: false, whatsapp: false
  });

  useEffect(() => {
    if (customer) {
      fetchAnalytics();
    }
  }, [customer]);

  // Load conversation logs when tabs are selected
  useEffect(() => {
    if (activeTab === 'chatbots' && !logsLoaded.chatbot) {
      fetchChatbotLogs();
    } else if (activeTab === 'voice' && !logsLoaded.voice) {
      fetchVoiceLogs();
    } else if (activeTab === 'whatsapp' && !logsLoaded.whatsapp) {
      fetchWhatsappLogs();
    }
  }, [activeTab]);

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

  const fetchChatbotLogs = async () => {
    setLogsLoading(prev => ({ ...prev, chatbot: true }));
    try {
      const data = await getCustomerChatbotConversations();
      setChatbotLogs(data.conversations || []);
      setLogsLoaded(prev => ({ ...prev, chatbot: true }));
    } catch (error) {
      console.error('Error fetching chatbot logs:', error);
    } finally {
      setLogsLoading(prev => ({ ...prev, chatbot: false }));
    }
  };

  const fetchVoiceLogs = async () => {
    setLogsLoading(prev => ({ ...prev, voice: true }));
    try {
      const data = await getCustomerVoiceCallLogs();
      setVoiceLogs(data.calls || []);
      setLogsLoaded(prev => ({ ...prev, voice: true }));
    } catch (error) {
      console.error('Error fetching voice logs:', error);
    } finally {
      setLogsLoading(prev => ({ ...prev, voice: false }));
    }
  };

  const fetchWhatsappLogs = async () => {
    setLogsLoading(prev => ({ ...prev, whatsapp: true }));
    try {
      const data = await getCustomerWhatsAppConversationLogs();
      setWhatsappLogs(data.conversations || []);
      setLogsLoaded(prev => ({ ...prev, whatsapp: true }));
    } catch (error) {
      console.error('Error fetching whatsapp logs:', error);
    } finally {
      setLogsLoading(prev => ({ ...prev, whatsapp: false }));
    }
  };

  const formatDuration = (seconds: number | null | undefined) => {
    // Handle null, undefined, NaN, and 0
    const sec = typeof seconds === 'number' && !isNaN(seconds) ? Math.floor(seconds) : 0;
    if (sec <= 0) return '0s';

    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    }
    return `${secs}s`;
  };

  // Format percentage - cap at 100% and handle edge cases
  const formatPercentage = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    const percentage = value > 1 ? Math.min(value, 100) : Math.min(value * 100, 100);
    return `${percentage.toFixed(0)}%`;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get sentiment icon and color
  const getSentimentDisplay = (sentiment: string | null) => {
    if (!sentiment) return { icon: <Meh className="h-4 w-4" />, color: 'text-muted-foreground', label: 'Unknown' };
    const s = sentiment.toLowerCase();
    if (s.includes('positive') || s.includes('happy') || s.includes('satisfied')) {
      return { icon: <Smile className="h-4 w-4" />, color: 'text-emerald-600', label: 'Positive' };
    } else if (s.includes('negative') || s.includes('unhappy') || s.includes('frustrated')) {
      return { icon: <Frown className="h-4 w-4" />, color: 'text-red-500', label: 'Negative' };
    }
    return { icon: <Meh className="h-4 w-4" />, color: 'text-amber-500', label: 'Neutral' };
  };

  // Get outcome badge variant
  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    const o = outcome.toLowerCase();
    if (o.includes('success') || o.includes('converted') || o.includes('completed') || o.includes('qualified')) {
      return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">{outcome}</Badge>;
    } else if (o.includes('fail') || o.includes('lost') || o.includes('dropped')) {
      return <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">{outcome}</Badge>;
    }
    return <Badge variant="outline">{outcome}</Badge>;
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

  const totalInteractions = (analytics?.chatbots?.total_conversations ?? 0) +
                           (analytics?.voice_assistants?.total_calls ?? 0) +
                           (analytics?.whatsapp_agents?.total_conversations ?? 0);

  const totalAgents = (analytics?.chatbots?.assigned?.length ?? 0) +
                      (analytics?.voice_assistants?.assigned?.length ?? 0) +
                      (analytics?.whatsapp_agents?.assigned?.length ?? 0);

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
                    <p className="text-3xl font-bold mt-2">{analytics.leads?.total_count ?? 0}</p>
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
                      {formatPercentage(analytics.leads?.conversion_rates?.overall ?? 0)}
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
                      <span className="text-2xl font-semibold">{formatPercentage(analytics.leads?.conversion_rates?.chatbot ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversations</span>
                      <span>{analytics.chatbots?.total_conversations ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Messages</span>
                      <span>{analytics.chatbots?.total_messages ?? 0}</span>
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
                      <span className="text-2xl font-semibold">{formatPercentage(analytics.leads?.conversion_rates?.voice ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Calls</span>
                      <span>{analytics.voice_assistants?.total_calls ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span>{formatDuration(analytics.voice_assistants?.total_duration ?? 0)}</span>
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
                      <span className="text-2xl font-semibold">{formatPercentage(analytics.leads?.conversion_rates?.whatsapp ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversations</span>
                      <span>{analytics.whatsapp_agents?.total_conversations ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Messages</span>
                      <span>{analytics.whatsapp_agents?.total_messages ?? 0}</span>
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
                  {(analytics.leads?.recent?.length ?? 0) === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No leads captured yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Leads will appear here as your agents interact with visitors
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(analytics.leads?.recent ?? []).slice(0, 6).map((lead, index) => (
                        <div
                          key={lead.id}
                          className={`flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors ${
                            index !== (analytics.leads?.recent ?? []).slice(0, 6).length - 1 ? 'border-b' : ''
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

            <TabsContent value="chatbots" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chatbot Performance</CardTitle>
                  <CardDescription>Individual metrics for each chatbot</CardDescription>
                </CardHeader>
                <CardContent>
                  {(analytics.chatbots?.assigned?.length ?? 0) === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No chatbots connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(analytics.chatbots?.assigned ?? []).map((chatbot) => (
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

              {/* Conversation Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Conversations</CardTitle>
                  <CardDescription>Conversation logs with AI analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading.chatbot ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : chatbotLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No conversation logs available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatbotLogs.map((log) => (
                        <div key={log.id} className="p-4 rounded-lg border">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Bot className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{log.chatbot_name}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{log.message_count} messages</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{formatTimestamp(log.updated_at)}</p>
                            </div>
                            {log.lead_info && (log.lead_info.name || log.lead_info.email) && (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Lead Captured
                              </Badge>
                            )}
                          </div>

                          {log.summary && (
                            <div className="mb-3 p-3 bg-muted/30 rounded-md">
                              <p className="text-sm text-muted-foreground font-medium mb-1">Summary</p>
                              <p className="text-sm">{log.summary}</p>
                            </div>
                          )}

                          {log.lead_info && (log.lead_info.name || log.lead_info.email || log.lead_info.phone) && (
                            <div className="flex flex-wrap gap-3 text-sm">
                              {log.lead_info.name && (
                                <span className="text-muted-foreground">
                                  <span className="font-medium text-foreground">{log.lead_info.name}</span>
                                </span>
                              )}
                              {log.lead_info.email && (
                                <span className="text-muted-foreground">{log.lead_info.email}</span>
                              )}
                              {log.lead_info.phone && (
                                <span className="text-muted-foreground">{log.lead_info.phone}</span>
                              )}
                              {log.lead_info.company && (
                                <span className="text-muted-foreground">@ {log.lead_info.company}</span>
                              )}
                            </div>
                          )}

                          {log.last_message && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-1">Last message ({log.last_message.role})</p>
                              <p className="text-sm text-muted-foreground italic">&ldquo;{log.last_message.content}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Voice Assistant Performance</CardTitle>
                  <CardDescription>Call statistics for each assistant</CardDescription>
                </CardHeader>
                <CardContent>
                  {(analytics.voice_assistants?.assigned?.length ?? 0) === 0 ? (
                    <div className="text-center py-12">
                      <Phone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No voice assistants connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(analytics.voice_assistants?.assigned ?? []).map((assistant) => (
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

              {/* Call Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Calls</CardTitle>
                  <CardDescription>Call logs with AI analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading.voice ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : voiceLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No call logs available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {voiceLogs.map((log) => {
                        const sentiment = getSentimentDisplay(log.analysis.sentiment);
                        return (
                          <div key={log.id} className="p-4 rounded-lg border">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{log.assistant_name}</span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">{formatDuration(log.duration_seconds)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatTimestamp(log.started_at)}</span>
                                  {log.caller_phone && (
                                    <>
                                      <span>·</span>
                                      <span>{log.caller_phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {log.analysis.sentiment && (
                                  <div className={`flex items-center gap-1 text-xs ${sentiment.color}`}>
                                    {sentiment.icon}
                                    <span>{sentiment.label}</span>
                                  </div>
                                )}
                                {log.analysis.call_outcome && getOutcomeBadge(log.analysis.call_outcome)}
                              </div>
                            </div>

                            {log.analysis.summary && (
                              <div className="mb-3 p-3 bg-muted/30 rounded-md">
                                <p className="text-sm text-muted-foreground font-medium mb-1">Summary</p>
                                <p className="text-sm">{log.analysis.summary}</p>
                              </div>
                            )}

                            {log.analysis.key_points && log.analysis.key_points.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground font-medium mb-2">Key Points</p>
                                <ul className="space-y-1">
                                  {log.analysis.key_points.slice(0, 3).map((point, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {log.analysis.action_items && log.analysis.action_items.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground font-medium mb-2">Action Items</p>
                                <ul className="space-y-1">
                                  {log.analysis.action_items.slice(0, 3).map((item, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {log.analysis.topics_discussed && log.analysis.topics_discussed.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                                {log.analysis.topics_discussed.slice(0, 5).map((topic, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                                ))}
                              </div>
                            )}

                            {log.analysis.lead_info && (log.analysis.lead_info.name || log.analysis.lead_info.email || log.analysis.lead_info.phone) && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground font-medium mb-2">Lead Information</p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {log.analysis.lead_info.name && (
                                    <span className="font-medium">{log.analysis.lead_info.name}</span>
                                  )}
                                  {log.analysis.lead_info.email && (
                                    <span className="text-muted-foreground">{log.analysis.lead_info.email}</span>
                                  )}
                                  {log.analysis.lead_info.phone && (
                                    <span className="text-muted-foreground">{log.analysis.lead_info.phone}</span>
                                  )}
                                  {log.analysis.lead_info.company && (
                                    <span className="text-muted-foreground">@ {log.analysis.lead_info.company}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">WhatsApp Agent Performance</CardTitle>
                  <CardDescription>Conversation metrics for each agent</CardDescription>
                </CardHeader>
                <CardContent>
                  {(analytics.whatsapp_agents?.assigned?.length ?? 0) === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No WhatsApp agents connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(analytics.whatsapp_agents?.assigned ?? []).map((agent) => (
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

              {/* Conversation Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Conversations</CardTitle>
                  <CardDescription>WhatsApp conversation logs with AI analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {logsLoading.whatsapp ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : whatsappLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No conversation logs available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {whatsappLogs.map((log) => {
                        const sentiment = getSentimentDisplay(log.analysis.sentiment);
                        return (
                          <div key={log.id} className="p-4 rounded-lg border">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{log.agent_name}</span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">{log.message_count} messages</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatTimestamp(log.started_at)}</span>
                                  {log.customer_phone && (
                                    <>
                                      <span>·</span>
                                      <span>{log.customer_phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {log.analysis.sentiment && (
                                  <div className={`flex items-center gap-1 text-xs ${sentiment.color}`}>
                                    {sentiment.icon}
                                    <span>{sentiment.label}</span>
                                  </div>
                                )}
                                {log.analysis.conversation_outcome && getOutcomeBadge(log.analysis.conversation_outcome)}
                              </div>
                            </div>

                            {log.analysis.summary && (
                              <div className="mb-3 p-3 bg-muted/30 rounded-md">
                                <p className="text-sm text-muted-foreground font-medium mb-1">Summary</p>
                                <p className="text-sm">{log.analysis.summary}</p>
                              </div>
                            )}

                            {log.analysis.key_points && log.analysis.key_points.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground font-medium mb-2">Key Points</p>
                                <ul className="space-y-1">
                                  {log.analysis.key_points.slice(0, 3).map((point, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {log.analysis.action_items && log.analysis.action_items.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-muted-foreground font-medium mb-2">Action Items</p>
                                <ul className="space-y-1">
                                  {log.analysis.action_items.slice(0, 3).map((item, i) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {log.analysis.topics_discussed && log.analysis.topics_discussed.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                                {log.analysis.topics_discussed.slice(0, 5).map((topic, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                                ))}
                              </div>
                            )}

                            {log.analysis.lead_info && (log.analysis.lead_info.name || log.analysis.lead_info.email || log.analysis.lead_info.phone) && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground font-medium mb-2">Lead Information</p>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  {log.analysis.lead_info.name && (
                                    <span className="font-medium">{log.analysis.lead_info.name}</span>
                                  )}
                                  {log.analysis.lead_info.email && (
                                    <span className="text-muted-foreground">{log.analysis.lead_info.email}</span>
                                  )}
                                  {log.analysis.lead_info.phone && (
                                    <span className="text-muted-foreground">{log.analysis.lead_info.phone}</span>
                                  )}
                                  {log.analysis.lead_info.company && (
                                    <span className="text-muted-foreground">@ {log.analysis.lead_info.company}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
