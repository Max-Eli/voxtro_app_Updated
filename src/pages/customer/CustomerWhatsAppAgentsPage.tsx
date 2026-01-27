import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { syncCustomerWhatsAppConversations } from "@/integrations/api/endpoints/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MessageCircle, Clock, Calendar, FileText, TrendingUp, Phone, Search, Sparkles, CheckCircle, AlertCircle, Target, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyAgentState } from "@/components/customer/EmptyAgentState";

interface AgentWithDetails {
  id: string;
  name: string;
  phone_number: string | null;
  totalConversations: number;
}

interface Conversation {
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  start_time: number;
  end_time?: number;
  duration_seconds?: number;
  summary?: string;
  sentiment?: string;
  sentiment_notes?: string;
  phone_number?: string;
  key_points?: string[];
  action_items?: string[];
  conversation_outcome?: string;
  topics_discussed?: string[];
  lead_info?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    interest_level?: string;
    notes?: string;
  };
}

interface Message {
  role: string;
  content: string;
  timestamp: string;
}

export default function CustomerWhatsAppAgentsPage() {
  const { customer } = useCustomerAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [agents, setAgents] = useState<AgentWithDetails[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConversationDetail, setShowConversationDetail] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");

  useEffect(() => {
    if (customer) {
      fetchData();
    }
  }, [customer]);

  // Background sync function - syncs from ElevenLabs without blocking UI
  const syncFromElevenLabs = async () => {
    try {
      setSyncing(true);
      const result = await syncCustomerWhatsAppConversations();
      console.log('WhatsApp sync result:', result);
      // Refresh data after sync completes
      await loadCachedData();
    } catch (syncError) {
      console.log('WhatsApp sync error:', syncError);
    } finally {
      setSyncing(false);
    }
  };

  // Load data from database (fast - shows cached data immediately)
  const loadCachedData = async () => {
    try {
      // Get assigned agent IDs
      const { data: assignments, error: assignmentsError } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select('agent_id')
        .eq('customer_id', customer?.id);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setLoading(false);
        return false;
      }

      const agentIds = assignments.map(a => a.agent_id);

      // Get agent details
      const { data: agentData, error: agentError } = await supabase
        .from('whatsapp_agents')
        .select('*')
        .in('id', agentIds);

      if (agentError) throw agentError;

      // Get conversations from our local database
      const { data: conversationsData, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .in('agent_id', agentIds)
        .order('started_at', { ascending: false });

      if (convError) throw convError;

      // Map agents with stats
      const agentsWithStats = (agentData || []).map(agent => {
        const agentConversations = (conversationsData || []).filter(c => c.agent_id === agent.id);
        return {
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          phone_number: agent.phone_number,
          totalConversations: agentConversations.length,
        };
      });

      setAgents(agentsWithStats);

      // Format conversations
      const formattedConversations = (conversationsData || []).map(conv => {
        const agent = agentData?.find(a => a.id === conv.agent_id);
        return {
          conversation_id: conv.id,
          agent_id: conv.agent_id,
          agent_name: agent?.name || 'Unknown',
          status: conv.status || 'unknown',
          start_time: new Date(conv.started_at).getTime() / 1000,
          end_time: conv.ended_at ? new Date(conv.ended_at).getTime() / 1000 : undefined,
          duration_seconds: conv.ended_at
            ? Math.floor((new Date(conv.ended_at).getTime() - new Date(conv.started_at).getTime()) / 1000)
            : undefined,
          summary: conv.summary,
          sentiment: conv.sentiment,
          sentiment_notes: conv.sentiment_notes,
          phone_number: conv.phone_number,
          key_points: conv.key_points,
          action_items: conv.action_items,
          conversation_outcome: conv.conversation_outcome,
          topics_discussed: conv.topics_discussed,
          lead_info: conv.lead_info,
        };
      });

      setConversations(formattedConversations);
      setLoading(false);
      return agentIds.length > 0;
    } catch (error) {
      console.error('Error loading cached data:', error);
      setLoading(false);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      // Step 1: Load cached data immediately (fast - no API calls)
      const hasAgents = await loadCachedData();

      // Step 2: Sync from ElevenLabs in background (slow - don't block UI)
      if (hasAgents) {
        // Don't await - let it run in background and refresh when done
        syncFromElevenLabs();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp agent data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadConversationDetails = async (conversationId: string) => {
    setLoadingDetails(true);
    try {
      // Get messages for this conversation
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      setConversationDetails({
        messages: messages || [],
      });
    } catch (error) {
      console.error('Error loading conversation details:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (agents.length === 0) {
    return <EmptyAgentState type="whatsapp" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">WhatsApp Agents</h1>
            <p className="text-muted-foreground">
              View conversations and transcripts from your WhatsApp agents
            </p>
          </div>
          {syncing && (
            <Badge variant="secondary" className="animate-pulse">
              Updating...
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.totalConversations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversations.filter(c => {
                const oneDayAgo = Date.now() / 1000 - 86400;
                return c.start_time > oneDayAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Conversations in last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>Your WhatsApp Agents</CardTitle>
          <CardDescription>Overview of your assigned agents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{agent.name}</h3>
                    {agent.phone_number && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {agent.phone_number}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{agent.totalConversations}</p>
                  <p className="text-xs text-muted-foreground">Conversations</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Conversation History</CardTitle>
              <CardDescription>Complete history of all WhatsApp conversations</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredConversations = conversations.filter(conv => 
              !phoneSearch || 
              (conv.phone_number && conv.phone_number.toLowerCase().includes(phoneSearch.toLowerCase()))
            );
            
            if (filteredConversations.length === 0) {
              return (
                <p className="text-center text-muted-foreground py-8">
                  {phoneSearch ? 'No conversations match your search' : 'No conversations yet'}
                </p>
              );
            }
            
            return (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.conversation_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedConversation(conv);
                        loadConversationDetails(conv.conversation_id);
                        setShowConversationDetail(true);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{conv.agent_name}</h4>
                          <Badge variant={conv.status === 'done' || conv.status === 'completed' ? 'default' : 'secondary'}>
                            {conv.status}
                          </Badge>
                          {conv.sentiment && (
                            <Badge variant="outline">{conv.sentiment}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {conv.phone_number && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {conv.phone_number}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(conv.start_time * 1000), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(conv.start_time * 1000), 'h:mm a')}
                          </span>
                          {conv.duration_seconds && (
                            <span>Duration: {formatDuration(conv.duration_seconds)}</span>
                          )}
                        </div>
                        {conv.summary && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{conv.summary}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            );
          })()}
        </CardContent>
      </Card>

      {/* Conversation Detail Sheet */}
      <Sheet open={showConversationDetail} onOpenChange={setShowConversationDetail}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Conversation Details</SheetTitle>
            <SheetDescription>
              {selectedConversation && (
                <div className="text-sm space-y-2 mt-2">
                  {selectedConversation.phone_number && (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      <div>
                        <span className="text-xs text-muted-foreground block">WhatsApp Sender</span>
                        <span className="font-medium">+{selectedConversation.phone_number}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3 w-3" />
                    {selectedConversation.agent_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedConversation.start_time * 1000), 'MMM d, yyyy h:mm a')}
                  </div>
                  {selectedConversation.duration_seconds && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Duration: {formatDuration(selectedConversation.duration_seconds)}
                    </div>
                  )}
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* AI Summary Section - Compact */}
            {selectedConversation?.summary && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-sm font-semibold">AI Analysis</h3>
                </div>

                {/* Summary */}
                <div className="p-2.5 bg-muted/50 rounded-md">
                  <p className="text-xs leading-relaxed">{selectedConversation.summary}</p>
                </div>

                {/* Sentiment & Outcome */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedConversation.sentiment && (
                    <Badge variant={
                      selectedConversation.sentiment === 'positive' ? 'default' :
                      selectedConversation.sentiment === 'negative' ? 'destructive' : 'secondary'
                    } className="text-xs py-0">
                      {selectedConversation.sentiment === 'positive' && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                      {selectedConversation.sentiment === 'negative' && <AlertCircle className="h-2.5 w-2.5 mr-1" />}
                      {selectedConversation.sentiment.charAt(0).toUpperCase() + selectedConversation.sentiment.slice(1)}
                    </Badge>
                  )}
                  {selectedConversation.conversation_outcome && (
                    <Badge variant="outline" className="text-xs py-0">
                      <Target className="h-2.5 w-2.5 mr-1" />
                      {selectedConversation.conversation_outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                </div>

                {/* Sentiment Notes */}
                {selectedConversation.sentiment_notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {selectedConversation.sentiment_notes}
                  </p>
                )}

                {/* Key Points */}
                {selectedConversation.key_points && selectedConversation.key_points.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium flex items-center gap-1.5">
                      <MessageSquare className="h-2.5 w-2.5" />
                      Key Points
                    </h4>
                    <ul className="space-y-0.5 text-xs">
                      {selectedConversation.key_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {selectedConversation.action_items && selectedConversation.action_items.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium flex items-center gap-1.5">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Action Items
                    </h4>
                    <ul className="space-y-0.5 text-xs">
                      {selectedConversation.action_items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topics Discussed */}
                {selectedConversation.topics_discussed && selectedConversation.topics_discussed.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium">Topics</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedConversation.topics_discussed.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lead Info */}
                {selectedConversation.lead_info && (selectedConversation.lead_info.name || selectedConversation.lead_info.email || selectedConversation.lead_info.phone) && (
                  <div className="space-y-1 p-2 border rounded-md">
                    <h4 className="text-xs font-medium">Lead Information</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {selectedConversation.lead_info.name && (
                        <div>
                          <span className="text-muted-foreground">Name:</span> {selectedConversation.lead_info.name}
                        </div>
                      )}
                      {selectedConversation.lead_info.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span> {selectedConversation.lead_info.email}
                        </div>
                      )}
                      {selectedConversation.lead_info.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span> {selectedConversation.lead_info.phone}
                        </div>
                      )}
                      {selectedConversation.lead_info.company && (
                        <div>
                          <span className="text-muted-foreground">Company:</span> {selectedConversation.lead_info.company}
                        </div>
                      )}
                      {selectedConversation.lead_info.interest_level && (
                        <div>
                          <span className="text-muted-foreground">Interest:</span>{' '}
                          <Badge variant="outline" className="text-[10px] py-0">
                            {selectedConversation.lead_info.interest_level}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {selectedConversation.lead_info.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedConversation.lead_info.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Transcript */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Transcript</h3>
              </div>
              
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !conversationDetails?.messages?.length ? (
                <p className="text-center text-muted-foreground py-8">
                  No transcript available for this conversation
                </p>
              ) : (
                <div className="space-y-4">
                  {conversationDetails.messages.map((msg: any, index: number) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        msg.role === 'assistant' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'assistant'
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {msg.role === 'assistant' ? 'Agent' : 'User'}
                        </p>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-50 mt-1">
                          {format(new Date(msg.timestamp), 'h:mm:ss a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
