import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, Phone, MessageCircle, Bot, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerInfo {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
}

interface ConversationRow {
  id: string;
  chatbot_name: string;
  last_message: string;
  last_message_time: string;
  message_count: number;
}

interface CallRow {
  id: string;
  assistant_name: string;
  phone_number: string | null;
  started_at: string | null;
  duration_seconds: number;
  status: string;
  hidden_from_portal: boolean;
}

interface WaConversationRow {
  id: string;
  agent_name: string;
  contact_name: string | null;
  contact_number: string | null;
  last_message: string | null;
  last_message_time: string | null;
  message_count: number;
  hidden_from_portal: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminCustomerPreview() {
  const { customerId } = useParams<{ customerId: string }>();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [waConversations, setWaConversations] = useState<WaConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && customerId) {
      fetchAll();
    }
  }, [user, customerId]);

  const fetchAll = async () => {
    if (!customerId) return;
    setLoading(true);

    try {
      // 1. Customer info
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('id, email, full_name, company_name')
        .eq('id', customerId)
        .single();

      if (custErr || !cust) {
        toast.error('Customer not found');
        setLoading(false);
        return;
      }
      setCustomer(cust);

      // 2. Chatbot assignments
      const { data: chatbotAssignments } = await supabase
        .from('customer_chatbot_assignments')
        .select('chatbot_id, chatbots(id, name)')
        .eq('customer_id', customerId);

      const chatbotIds = chatbotAssignments?.map((a: any) => a.chatbot_id) || [];
      const chatbotNameMap: Record<string, string> = {};
      chatbotAssignments?.forEach((a: any) => {
        if (a.chatbots) chatbotNameMap[a.chatbot_id] = a.chatbots.name;
      });

      // 3. Chatbot conversations
      if (chatbotIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select(`
            conversation_id,
            content,
            role,
            created_at,
            conversations!inner(id, chatbot_id, hidden_from_portal)
          `)
          .in('conversations.chatbot_id', chatbotIds)
          .eq('conversations.hidden_from_portal', false)
          .order('created_at', { ascending: false })
          .limit(500);

        if (msgs) {
          const convMap = new Map<string, { messages: any[]; chatbot_id: string }>();
          msgs.forEach((m: any) => {
            const cid = m.conversation_id;
            if (!convMap.has(cid)) {
              convMap.set(cid, { messages: [], chatbot_id: m.conversations.chatbot_id });
            }
            convMap.get(cid)!.messages.push(m);
          });

          const rows: ConversationRow[] = [];
          convMap.forEach((data, cid) => {
            const sorted = data.messages.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            rows.push({
              id: cid,
              chatbot_name: chatbotNameMap[data.chatbot_id] || 'Unknown',
              last_message: sorted[0]?.content || '',
              last_message_time: sorted[0]?.created_at || '',
              message_count: sorted.length,
            });
          });
          rows.sort(
            (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
          );
          setConversations(rows);
        }
      }

      // 4. Voice assistant assignments
      const { data: vaAssignments } = await supabase
        .from('customer_assistant_assignments')
        .select('assistant_id, voice_assistants(id, name)')
        .eq('customer_id', customerId);

      const assistantIds = vaAssignments?.map((a: any) => a.assistant_id) || [];
      const assistantNameMap: Record<string, string> = {};
      vaAssignments?.forEach((a: any) => {
        if (a.voice_assistants) assistantNameMap[a.assistant_id] = a.voice_assistants.name;
      });

      // 5. Voice calls
      if (assistantIds.length > 0) {
        const { data: callData } = await supabase
          .from('voice_assistant_calls')
          .select('id, assistant_id, phone_number, started_at, duration_seconds, status, hidden_from_portal')
          .in('assistant_id', assistantIds)
          .order('started_at', { ascending: false })
          .limit(100);

        if (callData) {
          setCalls(
            callData.map((c: any) => ({
              ...c,
              assistant_name: assistantNameMap[c.assistant_id] || 'Unknown',
            }))
          );
        }
      }

      // 6. WhatsApp agent assignments
      const { data: waAssignments } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select('agent_id, whatsapp_agents(id, name)')
        .eq('customer_id', customerId);

      const waAgentIds = waAssignments?.map((a: any) => a.agent_id) || [];
      const waNameMap: Record<string, string> = {};
      waAssignments?.forEach((a: any) => {
        if (a.whatsapp_agents) waNameMap[a.agent_id] = a.whatsapp_agents.name;
      });

      // 7. WhatsApp conversations
      if (waAgentIds.length > 0) {
        const { data: waCons } = await supabase
          .from('whatsapp_conversations')
          .select('id, agent_id, contact_name, contact_number, last_message, last_message_at, message_count, hidden_from_portal')
          .in('agent_id', waAgentIds)
          .order('last_message_at', { ascending: false })
          .limit(100);

        if (waCons) {
          setWaConversations(
            waCons.map((c: any) => ({
              id: c.id,
              agent_name: waNameMap[c.agent_id] || 'Unknown',
              contact_name: c.contact_name,
              contact_number: c.contact_number,
              last_message: c.last_message,
              last_message_time: c.last_message_at,
              message_count: c.message_count || 0,
              hidden_from_portal: c.hidden_from_portal,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching preview data:', err);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Preview Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
        <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            Admin Preview Mode
            {customer && (
              <span className="font-normal ml-2">
                — viewing <span className="font-semibold">{customer.full_name}</span>'s portal
              </span>
            )}
          </p>
          {customer && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {customer.email}{customer.company_name ? ` · ${customer.company_name}` : ''}
            </p>
          )}
        </div>
        <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 flex-shrink-0">
          Read Only
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading customer data...</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chatbot Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversations.length}</div>
                <p className="text-xs text-muted-foreground">Visible in portal</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calls.length}</div>
                <p className="text-xs text-muted-foreground">
                  {calls.filter(c => c.hidden_from_portal).length} hidden
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp Conversations</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{waConversations.length}</div>
                <p className="text-xs text-muted-foreground">
                  {waConversations.filter(c => c.hidden_from_portal).length} hidden
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="conversations">
            <TabsList>
              <TabsTrigger value="conversations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversations ({conversations.length})
              </TabsTrigger>
              <TabsTrigger value="calls">
                <Phone className="h-4 w-4 mr-2" />
                Voice Calls ({calls.length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp ({waConversations.length})
              </TabsTrigger>
            </TabsList>

            {/* Conversations Tab */}
            <TabsContent value="conversations">
              <Card>
                <CardHeader>
                  <CardTitle>Chatbot Conversations</CardTitle>
                  <CardDescription>
                    Conversations visible to this customer in their portal (hidden ones excluded)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {conversations.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      No conversations found
                    </div>
                  ) : (
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                      {conversations.map((conv) => (
                        <div key={conv.id} className="flex items-start gap-3 px-4 py-3">
                          <Bot className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{conv.chatbot_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {conv.message_count} msgs
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(conv.last_message_time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Calls Tab */}
            <TabsContent value="calls">
              <Card>
                <CardHeader>
                  <CardTitle>Voice Call History</CardTitle>
                  <CardDescription>
                    All calls for this customer's assigned voice assistants
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {calls.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      No calls found
                    </div>
                  ) : (
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                      {calls.map((call) => (
                        <div
                          key={call.id}
                          className={`flex items-center gap-3 px-4 py-3 ${call.hidden_from_portal ? 'opacity-50' : ''}`}
                        >
                          <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{call.assistant_name}</span>
                              <Badge
                                variant={call.status === 'completed' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {call.status}
                              </Badge>
                              {call.hidden_from_portal && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {call.phone_number && (
                                <span>{call.phone_number}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(call.duration_seconds)}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatTimestamp(call.started_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Conversations</CardTitle>
                  <CardDescription>
                    All WhatsApp conversations for this customer's assigned agents
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {waConversations.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      No WhatsApp conversations found
                    </div>
                  ) : (
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                      {waConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={`flex items-start gap-3 px-4 py-3 ${conv.hidden_from_portal ? 'opacity-50' : ''}`}
                        >
                          <MessageCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium">
                                {conv.contact_name || conv.contact_number || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">via {conv.agent_name}</span>
                              {conv.hidden_from_portal && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Hidden
                                </Badge>
                              )}
                              {conv.message_count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {conv.message_count} msgs
                                </Badge>
                              )}
                            </div>
                            {conv.last_message && (
                              <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(conv.last_message_time)}
                          </span>
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
