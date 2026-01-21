import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  MessageSquare, 
  TrendingUp, 
  Users,
  Calendar,
  Activity,
  Phone,
  Clock,
  Bot,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ChatbotPerformance {
  id: string;
  name: string;
  conversations: number;
  messages: number;
  theme_color?: string;
}

interface VoiceAssistantPerformance {
  id: string;
  name: string;
  total_calls: number;
  total_duration: number;
  phone_number?: string;
}

interface WhatsAppAgentPerformance {
  id: string;
  name: string;
  conversations: number;
  messages: number;
  phone_number?: string;
}

interface AnalyticsData {
  // Chatbot analytics
  total_chatbot_conversations: number;
  total_chatbot_messages: number;
  avg_chatbot_conversation_length: number;
  chatbot_performance: ChatbotPerformance[];
  
  // Voice assistant analytics
  total_voice_calls: number;
  total_voice_duration: number;
  voice_assistant_performance: VoiceAssistantPerformance[];
  
  // WhatsApp analytics
  total_whatsapp_conversations: number;
  total_whatsapp_messages: number;
  whatsapp_agent_performance: WhatsAppAgentPerformance[];
  
  // Combined totals
  total_conversations: number;
  total_messages: number;
  total_interactions: number;
}

export function CustomerAnalyticsPage() {
  const { customer } = useCustomerAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (customer) {
      fetchAnalytics();
    }
  }, [customer]);

  const fetchAnalytics = async () => {
    if (!customer) return;

    try {
      // ========== CHATBOT ANALYTICS ==========
      const { data: chatbotAssignments, error: chatbotAssignmentsError } = await supabase
        .from('customer_chatbot_assignments')
        .select(`
          chatbot_id,
          chatbots (
            id,
            name,
            theme_color
          )
        `)
        .eq('customer_id', customer.id);

      if (chatbotAssignmentsError) throw chatbotAssignmentsError;

      const chatbotIds = chatbotAssignments?.map(a => a.chatbot_id) || [];
      
      let chatbotConversations: any[] = [];
      let chatbotMessages: any[] = [];
      
      if (chatbotIds.length > 0) {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('id, chatbot_id, created_at')
          .in('chatbot_id', chatbotIds);
        
        if (convError) throw convError;
        chatbotConversations = convData || [];

        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select(`
            id, 
            conversation_id, 
            created_at,
            conversations!inner(chatbot_id)
          `)
          .in('conversations.chatbot_id', chatbotIds);

        if (msgError) throw msgError;
        chatbotMessages = msgData || [];
      }

      const chatbotPerformance: ChatbotPerformance[] = chatbotAssignments?.map(assignment => {
        const chatbot = assignment.chatbots as any;
        const convCount = chatbotConversations.filter(c => c.chatbot_id === chatbot.id).length;
        const msgCount = chatbotMessages.filter(m => m.conversations?.chatbot_id === chatbot.id).length;

        return {
          id: chatbot.id,
          name: chatbot.name,
          conversations: convCount,
          messages: msgCount,
          theme_color: chatbot.theme_color
        };
      }) || [];

      // ========== VOICE ASSISTANT ANALYTICS ==========
      const { data: vaAssignments, error: vaError } = await supabase
        .from('customer_assistant_assignments')
        .select(`
          assistant_id,
          voice_assistants (
            id,
            name,
            phone_number
          )
        `)
        .eq('customer_id', customer.id);

      if (vaError) throw vaError;

      const assistantIds = vaAssignments?.map(a => a.assistant_id).filter(Boolean) || [];
      
      let voiceCalls: any[] = [];
      
      if (assistantIds.length > 0) {
        const { data: callsData, error: callsError } = await supabase
          .from('voice_assistant_calls')
          .select('id, assistant_id, duration_seconds, status, started_at')
          .in('assistant_id', assistantIds);

        if (callsError) throw callsError;
        voiceCalls = callsData || [];
      }

      const voiceAssistantPerformance: VoiceAssistantPerformance[] = vaAssignments?.map(assignment => {
        const assistant = assignment.voice_assistants as any;
        const assistantCalls = voiceCalls.filter(c => c.assistant_id === assignment.assistant_id);
        // Only count calls with valid duration
        const callsWithDuration = assistantCalls.filter(c => c.duration_seconds != null && c.duration_seconds > 0);
        const totalDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);

        return {
          id: assistant.id,
          name: assistant.name || 'Unnamed Assistant',
          total_calls: assistantCalls.length,
          total_duration: totalDuration,
          phone_number: assistant.phone_number
        };
      }) || [];

      // ========== WHATSAPP ANALYTICS ==========
      const { data: waAssignments, error: waError } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select(`
          agent_id,
          whatsapp_agents (
            id,
            name,
            phone_number
          )
        `)
        .eq('customer_id', customer.id);

      if (waError) throw waError;

      const waAgentIds = waAssignments?.map(a => a.agent_id) || [];
      
      let waConversations: any[] = [];
      let waMessages: any[] = [];
      
      if (waAgentIds.length > 0) {
        const { data: waConvData, error: waConvError } = await supabase
          .from('whatsapp_conversations')
          .select('id, agent_id, started_at')
          .in('agent_id', waAgentIds);

        if (waConvError) throw waConvError;
        waConversations = waConvData || [];

        const conversationIds = waConversations.map(c => c.id);
        
        if (conversationIds.length > 0) {
          const { data: waMsgData, error: waMsgError } = await supabase
            .from('whatsapp_messages')
            .select('id, conversation_id')
            .in('conversation_id', conversationIds);

          if (waMsgError) throw waMsgError;
          waMessages = waMsgData || [];
        }
      }

      const whatsappAgentPerformance: WhatsAppAgentPerformance[] = waAssignments?.map(assignment => {
        const agent = assignment.whatsapp_agents as any;
        const agentConvs = waConversations.filter(c => c.agent_id === assignment.agent_id);
        const agentConvIds = agentConvs.map(c => c.id);
        const agentMsgs = waMessages.filter(m => agentConvIds.includes(m.conversation_id));

        return {
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          conversations: agentConvs.length,
          messages: agentMsgs.length,
          phone_number: agent.phone_number
        };
      }) || [];

      // ========== CALCULATE TOTALS ==========
      const totalChatbotConversations = chatbotConversations.length;
      const totalChatbotMessages = chatbotMessages.length;
      const totalVoiceCalls = voiceCalls.length;
      // Only count calls with valid duration for total voice duration
      const callsWithValidDuration = voiceCalls.filter(c => c.duration_seconds != null && c.duration_seconds > 0);
      const totalVoiceDuration = callsWithValidDuration.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const totalWhatsAppConversations = waConversations.length;
      const totalWhatsAppMessages = waMessages.length;

      setAnalytics({
        total_chatbot_conversations: totalChatbotConversations,
        total_chatbot_messages: totalChatbotMessages,
        avg_chatbot_conversation_length: totalChatbotConversations > 0 
          ? Math.round(totalChatbotMessages / totalChatbotConversations) 
          : 0,
        chatbot_performance: chatbotPerformance,
        
        total_voice_calls: totalVoiceCalls,
        total_voice_duration: totalVoiceDuration,
        voice_assistant_performance: voiceAssistantPerformance,
        
        total_whatsapp_conversations: totalWhatsAppConversations,
        total_whatsapp_messages: totalWhatsAppMessages,
        whatsapp_agent_performance: whatsappAgentPerformance,
        
        total_conversations: totalChatbotConversations + totalWhatsAppConversations,
        total_messages: totalChatbotMessages + totalWhatsAppMessages,
        total_interactions: totalChatbotConversations + totalVoiceCalls + totalWhatsAppConversations
      });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Analytics
        </h1>
        <p className="text-muted-foreground">
          Comprehensive insights across all your connected agents
        </p>
      </div>

      {analytics && (
        <>
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total_interactions}</div>
                <p className="text-xs text-muted-foreground">
                  Conversations + Calls across all agents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total_messages}</div>
                <p className="text-xs text-muted-foreground">
                  Chatbot + WhatsApp messages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total_voice_calls}</div>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(analytics.total_voice_duration)} total duration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.chatbot_performance.length + 
                   analytics.voice_assistant_performance.length + 
                   analytics.whatsapp_agent_performance.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected agents
                </p>
              </CardContent>
            </Card>
          </div>

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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chatbot Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bot className="h-5 w-5" />
                      Chatbots
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agents</span>
                      <span className="font-medium">{analytics.chatbot_performance.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversations</span>
                      <span className="font-medium">{analytics.total_chatbot_conversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Messages</span>
                      <span className="font-medium">{analytics.total_chatbot_messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Length</span>
                      <span className="font-medium">{analytics.avg_chatbot_conversation_length} msgs</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Voice Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Phone className="h-5 w-5" />
                      Voice Assistants
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assistants</span>
                      <span className="font-medium">{analytics.voice_assistant_performance.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Calls</span>
                      <span className="font-medium">{analytics.total_voice_calls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Duration</span>
                      <span className="font-medium">{formatDuration(analytics.total_voice_duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Call</span>
                      <span className="font-medium">
                        {analytics.total_voice_calls > 0 
                          ? formatDuration(Math.round(analytics.total_voice_duration / analytics.total_voice_calls))
                          : '0m'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp Agents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agents</span>
                      <span className="font-medium">{analytics.whatsapp_agent_performance.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversations</span>
                      <span className="font-medium">{analytics.total_whatsapp_conversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Messages</span>
                      <span className="font-medium">{analytics.total_whatsapp_messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Length</span>
                      <span className="font-medium">
                        {analytics.total_whatsapp_conversations > 0 
                          ? Math.round(analytics.total_whatsapp_messages / analytics.total_whatsapp_conversations)
                          : 0} msgs
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>
                    Most active agents across all channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Most active chatbot */}
                    {analytics.chatbot_performance.length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Bot className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {analytics.chatbot_performance.reduce((prev, curr) => 
                                curr.conversations > prev.conversations ? curr : prev
                              ).name}
                            </p>
                            <p className="text-sm text-muted-foreground">Most Active Chatbot</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {analytics.chatbot_performance.reduce((prev, curr) => 
                              curr.conversations > prev.conversations ? curr : prev
                            ).conversations}
                          </p>
                          <p className="text-sm text-muted-foreground">conversations</p>
                        </div>
                      </div>
                    )}

                    {/* Most active voice assistant */}
                    {analytics.voice_assistant_performance.length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {analytics.voice_assistant_performance.reduce((prev, curr) => 
                                curr.total_calls > prev.total_calls ? curr : prev
                              ).name}
                            </p>
                            <p className="text-sm text-muted-foreground">Most Active Voice Assistant</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {analytics.voice_assistant_performance.reduce((prev, curr) => 
                              curr.total_calls > prev.total_calls ? curr : prev
                            ).total_calls}
                          </p>
                          <p className="text-sm text-muted-foreground">calls</p>
                        </div>
                      </div>
                    )}

                    {/* Most active WhatsApp agent */}
                    {analytics.whatsapp_agent_performance.length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {analytics.whatsapp_agent_performance.reduce((prev, curr) => 
                                curr.conversations > prev.conversations ? curr : prev
                              ).name}
                            </p>
                            <p className="text-sm text-muted-foreground">Most Active WhatsApp Agent</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {analytics.whatsapp_agent_performance.reduce((prev, curr) => 
                              curr.conversations > prev.conversations ? curr : prev
                            ).conversations}
                          </p>
                          <p className="text-sm text-muted-foreground">conversations</p>
                        </div>
                      </div>
                    )}

                    {analytics.chatbot_performance.length === 0 && 
                     analytics.voice_assistant_performance.length === 0 && 
                     analytics.whatsapp_agent_performance.length === 0 && (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No agents connected yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                    Detailed breakdown by individual chatbot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.chatbot_performance.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No chatbots connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.chatbot_performance.map((chatbot) => (
                        <div 
                          key={chatbot.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chatbot.theme_color || '#3b82f6' }}
                            />
                            <div>
                              <h4 className="font-medium">{chatbot.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {chatbot.conversations} conversations • {chatbot.messages} messages
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {chatbot.conversations > 0 ? Math.round(chatbot.messages / chatbot.conversations) : 0} avg msgs
                            </div>
                            <div className="text-xs text-muted-foreground">
                              per conversation
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
                    Call statistics by voice assistant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.voice_assistant_performance.length === 0 ? (
                    <div className="text-center py-8">
                      <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No voice assistants connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.voice_assistant_performance.map((assistant) => (
                        <div 
                          key={assistant.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Phone className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium">{assistant.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {assistant.phone_number || 'No phone number'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {assistant.total_calls} calls
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(assistant.total_duration)}
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
                    Conversation statistics by WhatsApp agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.whatsapp_agent_performance.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No WhatsApp agents connected</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.whatsapp_agent_performance.map((agent) => (
                        <div 
                          key={agent.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                              <MessageCircle className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <h4 className="font-medium">{agent.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {agent.phone_number || 'No phone number'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {agent.conversations} conversations
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {agent.messages} messages
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
    </div>
  );
}