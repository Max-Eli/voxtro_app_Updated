import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, Phone, Settings, AlertCircle, UserPlus, Trash2, ChevronRight, Search, Bot, Sparkles, Mic2, Clock, Users2, Save, Loader2, Calendar, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { syncWhatsAppAgents, updateWhatsAppAgent, getWhatsAppAgent } from "@/integrations/api/endpoints";

interface WhatsAppAgent {
  id: string;
  name: string | null;
  phone_number: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AgentConfig {
  agent_id: string;
  name: string;
  phone_number: string | null;
  system_prompt: string;
  first_message: string;
  language: string;
  voice_id: string;
  model_id: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  tools: any[];
  data_collection: any;
  max_duration_seconds?: number;
  conversation_config?: any;
}

interface Conversation {
  conversation_id: string;
  status: string;
  start_time_unix_secs: number;
  end_time_unix_secs?: number;
  call_duration_secs?: number;
  summary?: string;
  sentiment?: string;
  phone_number?: string;
}

interface DbConversation {
  id: string;
  agent_id: string;
  status: string | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  sentiment: string | null;
  phone_number: string | null;
}

interface Customer {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
}

interface AssignmentWithCustomer {
  id: string;
  agent_id: string;
  customer: Customer;
}

const WhatsAppAgents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<WhatsAppAgent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<AgentConfig>>({});
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [showConversationDetail, setShowConversationDetail] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [dbConversations, setDbConversations] = useState<DbConversation[]>([]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('elevenlabs_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setHasConnection(!!data);
    } catch (error) {
      console.error('Error checking connection:', error);
      setHasConnection(false);
    }
  };

  const fetchAgents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load WhatsApp agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      const { data: chatbotsData } = await supabase
        .from('chatbots')
        .select('id')
        .eq('user_id', user.id);

      const chatbotIds = chatbotsData?.map(c => c.id) || [];

      if (chatbotIds.length > 0) {
        const { data: customersData, error } = await supabase
          .from('customers')
          .select(`
            *,
            customer_chatbot_assignments!inner (
              chatbot_id
            )
          `)
          .in('customer_chatbot_assignments.chatbot_id', chatbotIds);

        if (error) throw error;
        
        const uniqueCustomers = Array.from(
          new Map(customersData?.map(c => [c.id, c])).values()
        ) as Customer[];
        
        setCustomers(uniqueCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select(`
          id,
          agent_id,
          customers (
            id,
            email,
            full_name,
            company_name
          )
        `)
        .eq('assigned_by', user.id);

      if (error) throw error;
      
      const formattedAssignments = data?.map(a => ({
        id: a.id,
        agent_id: a.agent_id,
        customer: a.customers as unknown as Customer
      })) || [];
      
      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchAgentConfig = useCallback(async (agentId: string) => {
    setLoadingConfig(true);
    try {
      const data = await getWhatsAppAgent(agentId);

      if (data.agent) {
        setAgentConfig(data.agent);
        setFormData(data.agent);
      }
      if (data.conversations) {
        setConversations(data.conversations);
      }

      // Also fetch conversations from local database with summary and sentiment
      const { data: dbConvs, error: dbError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false });

      if (!dbError && dbConvs) {
        setDbConversations(dbConvs);
      }
    } catch (error: any) {
      console.error('Error fetching agent config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load agent configuration",
        variant: "destructive",
      });
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const loadConversationMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setConversationMessages(messages || []);
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    loadConversationMessages(conv.conversation_id);
    setShowConversationDetail(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const syncAgents = async () => {
    setSyncing(true);
    try {
      const data = await syncWhatsAppAgents();

      if (data.needsConnection) {
        setHasConnection(false);
        toast({
          title: "Connection Required",
          description: "Please connect your ElevenLabs account in Settings first.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Synced ${data.count} agents from ElevenLabs`,
      });

      await fetchAgents();
    } catch (error: any) {
      console.error('Error syncing agents:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync agents",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAgentId || !formData) return;

    setSaving(true);
    try {
      const updates: any = {};
      
      if (formData.name !== agentConfig?.name) updates.name = formData.name;
      if (formData.system_prompt !== agentConfig?.system_prompt) updates.system_prompt = formData.system_prompt;
      if (formData.first_message !== agentConfig?.first_message) updates.first_message = formData.first_message;
      if (formData.language !== agentConfig?.language) updates.language = formData.language;
      if (formData.voice_id !== agentConfig?.voice_id) updates.voice_id = formData.voice_id;
      if (formData.llm_model !== agentConfig?.llm_model) updates.llm_model = formData.llm_model;
      if (formData.temperature !== agentConfig?.temperature) updates.temperature = formData.temperature;
      if (formData.max_duration_seconds !== agentConfig?.max_duration_seconds) updates.max_duration_seconds = formData.max_duration_seconds;

      if (Object.keys(updates).length === 0) {
        toast({
          title: "No changes",
          description: "No changes to save",
        });
        return;
      }

      await updateWhatsAppAgent(selectedAgentId, updates);

      toast({
        title: "Success",
        description: "Agent updated successfully",
      });

      // Refresh the config
      await fetchAgentConfig(selectedAgentId);
      await fetchAgents();
    } catch (error: any) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save agent",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId || !selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .insert({
          customer_id: selectedCustomer,
          agent_id: selectedAgentId,
          assigned_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "This customer is already assigned to this agent",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Agent assigned to customer successfully",
      });
      setShowAssignDialog(false);
      setSelectedCustomer('');
      await fetchAssignments();
    } catch (error) {
      console.error('Error assigning agent:', error);
      toast({
        title: "Error",
        description: "Failed to assign agent",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment removed",
      });
      await fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
    }
  };

  // Auto-sync on page load
  const performAutoSync = useCallback(async () => {
    if (syncing) return; // Prevent concurrent syncs
    
    setSyncing(true);
    try {
      const data = await syncWhatsAppAgents();

      if (data?.needsConnection) {
        setHasConnection(false);
        return;
      }

      console.log(`Auto-synced ${data?.count || 0} WhatsApp agents`);
    } catch (error) {
      console.error('Auto-sync error:', error);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    if (user) {
      checkConnection();
      
      // Auto-sync on initial load, then fetch data
      performAutoSync().then(() => {
        fetchAgents();
        fetchCustomers();
        fetchAssignments();
      });
      
      // Set up periodic auto-sync every 2 minutes
      const syncInterval = setInterval(() => {
        performAutoSync().then(() => fetchAgents());
      }, 120000);
      
      return () => clearInterval(syncInterval);
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentConfig(selectedAgentId);
    }
  }, [selectedAgentId, fetchAgentConfig]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedAssignments = assignments.filter(a => a.agent_id === selectedAgentId);
  const filteredAgents = agents.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return <div className="p-6">Please log in to view WhatsApp agents.</div>;
  }

  if (hasConnection === false) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">WhatsApp Agents</h1>
          <p className="text-muted-foreground">Manage your ElevenLabs WhatsApp agents</p>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" />
              <CardTitle>Connection Required</CardTitle>
            </div>
            <CardDescription>
              Connect your ElevenLabs account to view and manage your WhatsApp agents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Agent List */}
      <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">WhatsApp Agents</h1>
          </div>
          <Button onClick={syncAgents} disabled={syncing} size="sm" variant="outline" className="w-full gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Agents'}
          </Button>
          
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredAgents.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No matching agents' : 'No agents found'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-muted-foreground mt-1">Click Sync to fetch your agents</p>
                )}
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const assignmentCount = assignments.filter(a => a.agent_id === agent.id).length;
                const isSelected = selectedAgentId === agent.id;
                
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                          {agent.name || 'Unnamed Agent'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {agent.phone_number && (
                            <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {agent.phone_number}
                            </span>
                          )}
                          {assignmentCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {assignmentCount} assigned
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {agents.length > 0 && (
          <div className="p-3 border-t border-border bg-background/50">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{agents.length} agents</span>
              <span>{assignments.length} assignments</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Agent Details */}
      <div className="flex-1 overflow-auto">
        {selectedAgent ? (
          <div className="p-6 max-w-4xl">
            {/* Agent Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20">
                  <MessageCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{selectedAgent.name || 'Unnamed Agent'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedAgent.phone_number && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedAgent.phone_number}
                      </span>
                    )}
                    <Badge variant={selectedAgent.status === 'active' ? 'default' : 'secondary'}>
                      {selectedAgent.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                  className="gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>

            {loadingConfig ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : agentConfig ? (
              <Tabs defaultValue="config" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="voice">Voice & Model</TabsTrigger>
                  <TabsTrigger value="conversations">Conversations ({conversations.length})</TabsTrigger>
                  <TabsTrigger value="customers">Customers ({selectedAssignments.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Agent Name</Label>
                        <Input
                          id="name"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="first_message">First Message</Label>
                        <Textarea
                          id="first_message"
                          value={formData.first_message || ''}
                          onChange={(e) => setFormData({ ...formData, first_message: e.target.value })}
                          placeholder="The first message the agent will say..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={formData.language || 'en'}
                          onValueChange={(value) => setFormData({ ...formData, language: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="it">Italian</SelectItem>
                            <SelectItem value="pt">Portuguese</SelectItem>
                            <SelectItem value="nl">Dutch</SelectItem>
                            <SelectItem value="pl">Polish</SelectItem>
                            <SelectItem value="ja">Japanese</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                            <SelectItem value="ko">Korean</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Prompt</CardTitle>
                      <CardDescription>
                        Define how the agent should behave and respond
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={formData.system_prompt || ''}
                        onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                        placeholder="You are a helpful assistant..."
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>

                  {agentConfig.tools && agentConfig.tools.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Connected Tools</CardTitle>
                        <CardDescription>
                          Tools and functions available to this agent
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {agentConfig.tools.map((tool: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <p className="font-medium">{tool.name || `Tool ${index + 1}`}</p>
                              {tool.description && (
                                <p className="text-sm text-muted-foreground">{tool.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="voice" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Voice Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="voice_id">Voice ID</Label>
                        <Input
                          id="voice_id"
                          value={formData.voice_id || ''}
                          onChange={(e) => setFormData({ ...formData, voice_id: e.target.value })}
                          placeholder="ElevenLabs Voice ID"
                        />
                        <p className="text-xs text-muted-foreground">
                          The ElevenLabs voice ID to use for text-to-speech
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">LLM Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="llm_model">Model</Label>
                        <Input
                          id="llm_model"
                          value={formData.llm_model || ''}
                          onChange={(e) => setFormData({ ...formData, llm_model: e.target.value })}
                          placeholder="gpt-4o-mini"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Temperature: {formData.temperature?.toFixed(2) || '0.70'}</Label>
                        <Slider
                          value={[formData.temperature || 0.7]}
                          onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                          min={0}
                          max={1}
                          step={0.01}
                        />
                        <p className="text-xs text-muted-foreground">
                          Controls randomness. Lower is more focused, higher is more creative.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_duration">Max Call Duration (seconds)</Label>
                        <Input
                          id="max_duration"
                          type="number"
                          value={formData.max_duration_seconds || ''}
                          onChange={(e) => setFormData({ ...formData, max_duration_seconds: parseInt(e.target.value) || undefined })}
                          placeholder="No limit"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conversations" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Conversations</CardTitle>
                      <CardDescription>
                        Click on a conversation to view the transcript and AI summary
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dbConversations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No conversations yet. Sync conversations to see them here.
                        </p>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-3">
                            {dbConversations.map((conv) => {
                              const duration = conv.ended_at 
                                ? Math.floor((new Date(conv.ended_at).getTime() - new Date(conv.started_at).getTime()) / 1000)
                                : undefined;
                              
                              const conversationData: Conversation = {
                                conversation_id: conv.id,
                                status: conv.status || 'unknown',
                                start_time_unix_secs: new Date(conv.started_at).getTime() / 1000,
                                end_time_unix_secs: conv.ended_at ? new Date(conv.ended_at).getTime() / 1000 : undefined,
                                call_duration_secs: duration,
                                summary: conv.summary || undefined,
                                sentiment: conv.sentiment || undefined,
                                phone_number: conv.phone_number || undefined,
                              };

                              return (
                                <div
                                  key={conv.id}
                                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                  onClick={() => handleConversationClick(conversationData)}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
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
                                          +{conv.phone_number}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(conv.started_at), 'MMM d, yyyy')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(conv.started_at), 'h:mm a')}
                                      </span>
                                      {duration && (
                                        <span>Duration: {formatDuration(duration)}</span>
                                      )}
                                    </div>
                                    {conv.summary && (
                                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{conv.summary}</p>
                                    )}
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="customers" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Assigned Customers</CardTitle>
                          <CardDescription>
                            Customers who can view this agent's conversations
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAssignDialog(true)}
                          className="gap-1.5"
                        >
                          <UserPlus className="h-4 w-4" />
                          Assign Customer
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedAssignments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No customers assigned to this agent
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-4 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/10">
                                  <Users2 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{assignment.customer.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{assignment.customer.email}</p>
                                  {assignment.customer.company_name && (
                                    <p className="text-xs text-muted-foreground">{assignment.customer.company_name}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveAssignment(assignment.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    Failed to load agent configuration
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select an agent to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Assign Customer Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Customer</DialogTitle>
            <DialogDescription>
              Select a customer to give them access to this agent's conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers
                  .filter(c => !selectedAssignments.some(a => a.customer.id === c.id))
                  .map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div>
                        <p>{customer.full_name}</p>
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignAgent} disabled={!selectedCustomer}>
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                        <span className="font-medium text-foreground">+{selectedConversation.phone_number}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedConversation.start_time_unix_secs * 1000), 'MMM d, yyyy h:mm a')}
                  </div>
                  {selectedConversation.call_duration_secs && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Duration: {formatDuration(selectedConversation.call_duration_secs)}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedConversation.status === 'done' || selectedConversation.status === 'completed' ? 'default' : 'secondary'}>
                      {selectedConversation.status}
                    </Badge>
                    {selectedConversation.sentiment && (
                      <Badge variant="outline">{selectedConversation.sentiment}</Badge>
                    )}
                  </div>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* AI Summary */}
            {selectedConversation?.summary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">AI Summary</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{selectedConversation.summary}</p>
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Transcript</h3>
              </div>
              
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : conversationMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transcript available for this conversation
                </p>
              ) : (
                <div className="space-y-4">
                  {conversationMessages.map((msg: any, index: number) => (
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
};

export default WhatsAppAgents;
