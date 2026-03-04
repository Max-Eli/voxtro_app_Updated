import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import {
  Eye,
  MessageSquare,
  Phone,
  MessageCircle,
  Bot,
  Clock,
  Calendar,
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Headphones,
  Search,
  ChevronRight,
  Sparkles,
  User,
  Mail,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CustomerInfo {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
}

interface ChatbotInfo { id: string; name: string }
interface AssistantInfo { id: string; name: string }
interface WaAgentInfo { id: string; name: string; phone_number?: string }

interface ConversationRow {
  id: string;
  chatbot_name: string;
  chatbot_id: string;
  last_message: string;
  last_message_time: string;
  message_count: number;
  last_sender: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface CallRow {
  id: string;
  assistant_name: string;
  phone_number: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  status: string;
  hidden_from_portal: boolean;
  recording_url?: string;
  summary?: string;
  key_points?: string[];
  action_items?: string[];
  lead_info?: { name?: string; email?: string; phone?: string };
}

interface TranscriptRow {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface WaConversation {
  id: string;
  agent_id: string;
  agent_name: string;
  phone_number: string | null;
  started_at: string | null;
  status: string;
  duration_seconds?: number;
  summary?: string;
  sentiment?: string;
  key_points?: string[];
  action_items?: string[];
  lead_info?: { name?: string; email?: string; phone?: string };
  hidden_from_portal: boolean;
}

interface LeadRow {
  id: string;
  source_type: string;
  source_name: string | null;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  additional_data: any;
  extracted_at: string;
}

type Section = 'overview' | 'conversations' | 'calls' | 'whatsapp' | 'leads';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(ts: string | null | number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function truncate(text: string, max = 80): string {
  return text.length > max ? text.substring(0, max) + '…' : text;
}

function isValidField(val: string | null | undefined): boolean {
  if (!val) return false;
  const n = val.trim().toLowerCase();
  if (['', 'unknown', 'n/a', 'none', '-', 'not provided', 'not mentioned', 'not available'].includes(n)) return false;
  if (n.includes('if mentioned') || n.includes('if provided') || n.includes('not specified')) return false;
  return true;
}

// ── Sidebar Nav ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview',       label: 'Overview',         icon: LayoutDashboard },
  { id: 'conversations',  label: 'Conversations',    icon: MessageSquare },
  { id: 'calls',          label: 'Voice Calls',      icon: Phone },
  { id: 'whatsapp',       label: 'WhatsApp',         icon: MessageCircle },
  { id: 'leads',          label: 'Leads',            icon: Users },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminCustomerPreview() {
  const { customerId } = useParams<{ customerId: string }>();
  const { user } = useAuth();

  const [section, setSection] = useState<Section>('overview');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  // Assignments
  const [chatbots, setChatbots] = useState<ChatbotInfo[]>([]);
  const [assistants, setAssistants] = useState<AssistantInfo[]>([]);
  const [waAgents, setWaAgents] = useState<WaAgentInfo[]>([]);

  // Data
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [waConversations, setWaConversations] = useState<WaConversation[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  // Detail state
  const [selectedConv, setSelectedConv] = useState<ConversationRow | null>(null);
  const [convMessages, setConvMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showConvDetail, setShowConvDetail] = useState(false);

  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);
  const [showCallDetail, setShowCallDetail] = useState(false);

  const [selectedWa, setSelectedWa] = useState<WaConversation | null>(null);
  const [showWaDetail, setShowWaDetail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [convSearch, setConvSearch] = useState('');
  const [callSearch, setCallSearch] = useState('');
  const [waSearch, setWaSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  const fetchAll = useCallback(async () => {
    if (!customerId || !user) return;
    setLoading(true);

    try {
      // Customer info
      const { data: cust, error: custErr } = await supabase
        .from('customers').select('id, email, full_name, company_name')
        .eq('id', customerId).single();
      if (custErr || !cust) { toast.error('Customer not found'); setLoading(false); return; }
      setCustomer(cust);

      // ── Chatbot assignments & conversations ──────────────────────────────
      const { data: cbAssign } = await supabase
        .from('customer_chatbot_assignments')
        .select('chatbot_id, chatbots(id, name)')
        .eq('customer_id', customerId);

      const cbList: ChatbotInfo[] = (cbAssign || []).map((a: any) => ({ id: a.chatbot_id, name: a.chatbots?.name || 'Unknown' }));
      setChatbots(cbList);
      const cbIds = cbList.map(c => c.id);
      const cbNameMap: Record<string, string> = Object.fromEntries(cbList.map(c => [c.id, c.name]));

      if (cbIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, content, role, created_at, conversations!inner(id, chatbot_id, hidden_from_portal)')
          .in('conversations.chatbot_id', cbIds)
          .eq('conversations.hidden_from_portal', false)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (msgs) {
          const convMap = new Map<string, { msgs: any[]; chatbot_id: string }>();
          msgs.forEach((m: any) => {
            const cid = m.conversation_id;
            if (!convMap.has(cid)) convMap.set(cid, { msgs: [], chatbot_id: m.conversations.chatbot_id });
            convMap.get(cid)!.msgs.push(m);
          });
          const rows: ConversationRow[] = [];
          convMap.forEach((d, cid) => {
            const sorted = [...d.msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            rows.push({
              id: cid,
              chatbot_name: cbNameMap[d.chatbot_id] || 'Unknown',
              chatbot_id: d.chatbot_id,
              last_message: sorted[0]?.content || '',
              last_message_time: sorted[0]?.created_at || '',
              message_count: sorted.length,
              last_sender: sorted[0]?.role || 'user',
            });
          });
          rows.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
          setConversations(rows);
        }
      }

      // ── Voice assistant assignments & calls ──────────────────────────────
      const { data: vaAssign } = await supabase
        .from('customer_assistant_assignments')
        .select('assistant_id, voice_assistants(id, name)')
        .eq('customer_id', customerId);

      const vaList: AssistantInfo[] = (vaAssign || []).map((a: any) => ({ id: a.assistant_id, name: a.voice_assistants?.name || 'Unknown' }));
      setAssistants(vaList);
      const vaIds = vaList.map(a => a.id);
      const vaNameMap: Record<string, string> = Object.fromEntries(vaList.map(a => [a.id, a.name]));

      if (vaIds.length > 0) {
        const { data: callData } = await supabase
          .from('voice_assistant_calls')
          .select('id, assistant_id, phone_number, started_at, ended_at, duration_seconds, status, hidden_from_portal, summary, key_points, action_items, lead_info')
          .in('assistant_id', vaIds)
          .order('started_at', { ascending: false })
          .limit(200);

        const { data: recordings } = await supabase
          .from('voice_assistant_recordings')
          .select('call_id, recording_url')
          .in('call_id', (callData || []).map((c: any) => c.id));

        const recMap = new Map((recordings || []).map((r: any) => [r.call_id, r.recording_url]));

        setCalls((callData || []).map((c: any) => ({
          ...c,
          assistant_name: vaNameMap[c.assistant_id] || 'Unknown',
          recording_url: recMap.get(c.id),
        })));
      }

      // ── WhatsApp agent assignments & conversations ────────────────────────
      const { data: waAssign } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select('agent_id, whatsapp_agents(id, name, phone_number)')
        .eq('customer_id', customerId);

      const waList: WaAgentInfo[] = (waAssign || []).map((a: any) => ({
        id: a.agent_id,
        name: a.whatsapp_agents?.name || 'Unknown',
        phone_number: a.whatsapp_agents?.phone_number,
      }));
      setWaAgents(waList);
      const waIds = waList.map(a => a.id);
      const waNameMap: Record<string, string> = Object.fromEntries(waList.map(a => [a.id, a.name]));

      if (waIds.length > 0) {
        const { data: waCons } = await supabase
          .from('whatsapp_conversations')
          .select('id, agent_id, phone_number, started_at, ended_at, status, summary, sentiment, key_points, action_items, lead_info, hidden_from_portal')
          .in('agent_id', waIds)
          .order('started_at', { ascending: false })
          .limit(200);

        setWaConversations((waCons || []).map((c: any) => ({
          id: c.id,
          agent_id: c.agent_id,
          agent_name: waNameMap[c.agent_id] || 'Unknown',
          phone_number: c.phone_number,
          started_at: c.started_at,
          status: c.status || 'unknown',
          duration_seconds: c.ended_at && c.started_at
            ? Math.floor((new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 1000)
            : undefined,
          summary: c.summary,
          sentiment: c.sentiment,
          key_points: c.key_points,
          action_items: c.action_items,
          lead_info: c.lead_info,
          hidden_from_portal: c.hidden_from_portal,
        })));
      }

      // ── Leads ─────────────────────────────────────────────────────────────
      const allSourceIds = [...cbIds, ...vaIds, ...waIds];
      if (allSourceIds.length > 0) {
        const { data: leadsData } = await supabase
          .from('leads')
          .select('id, source_type, source_name, name, email, phone_number, additional_data, extracted_at')
          .eq('user_id', user.id)
          .in('source_id', allSourceIds)
          .order('extracted_at', { ascending: false });
        setLeads(leadsData || []);
      }

    } catch (err) {
      console.error('Preview data error:', err);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }, [customerId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadConvMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data } = await supabase
        .from('messages').select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setConvMessages(data || []);
    } catch { toast.error('Failed to load messages'); }
    finally { setLoadingMessages(false); }
  };

  const loadTranscripts = async (callId: string) => {
    setLoadingTranscripts(true);
    try {
      const { data } = await supabase
        .from('voice_assistant_transcripts').select('id, role, content, timestamp')
        .eq('call_id', callId).order('timestamp', { ascending: true });
      setTranscripts(data || []);
    } catch { toast.error('Failed to load transcript'); }
    finally { setLoadingTranscripts(false); }
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Admin access required.</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-muted-foreground">Loading customer portal…</p>
      </div>
    </div>
  );

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(c =>
    !convSearch || c.last_message.toLowerCase().includes(convSearch.toLowerCase()) || c.chatbot_name.toLowerCase().includes(convSearch.toLowerCase())
  );
  const filteredCalls = calls.filter(c =>
    !callSearch || (c.phone_number && c.phone_number.includes(callSearch)) || c.assistant_name.toLowerCase().includes(callSearch.toLowerCase())
  );
  const filteredWa = waConversations.filter(c =>
    !waSearch || (c.phone_number && c.phone_number.includes(waSearch)) || c.agent_name.toLowerCase().includes(waSearch.toLowerCase())
  );
  const validLeads = leads.filter(l =>
    isValidField(l.name) && isValidField(l.email) && (isValidField(l.phone_number) || isValidField(l.additional_data?.caller_id))
  ).filter(l =>
    !leadSearch || l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.email?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone_number?.includes(leadSearch)
  );

  // ── Stat totals ───────────────────────────────────────────────────────────
  const totalCalls = calls.length;
  const totalDuration = calls.reduce((s, c) => s + (c.duration_seconds || 0), 0);
  const visibleCalls = calls.filter(c => !c.hidden_from_portal).length;
  const visibleWa = waConversations.filter(c => !c.hidden_from_portal).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Preview Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 flex items-center gap-3 z-50 flex-shrink-0">
        <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
          <span className="font-semibold">Admin Preview Mode</span>
          {customer && <> — viewing <span className="font-semibold">{customer.full_name}</span>'s portal ({customer.email}){customer.company_name ? ` · ${customer.company_name}` : ''}</>}
        </p>
        <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 text-xs flex-shrink-0">Read-Only Preview</Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-56 border-r bg-card flex-shrink-0 flex flex-col">
          <div className="px-4 py-5 border-b">
            <p className="font-semibold text-sm truncate">{customer?.full_name || 'Customer'}</p>
            <p className="text-xs text-muted-foreground truncate">{customer?.email}</p>
            {customer?.company_name && <p className="text-xs text-muted-foreground truncate">{customer.company_name}</p>}
          </div>
          <nav className="flex-1 py-3 space-y-0.5 px-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              {chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''} · {assistants.length} voice · {waAgents.length} WA
            </p>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">

          {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
          {section === 'overview' && (
            <div className="p-8 space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Overview</h1>
                <p className="text-muted-foreground text-sm">Summary of {customer?.full_name}'s portal activity</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Chatbot Conversations</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversations.length}</div>
                    <p className="text-xs text-muted-foreground">Across {chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalCalls}</div>
                    <p className="text-xs text-muted-foreground">{visibleCalls} visible · {totalCalls - visibleCalls} hidden</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">WhatsApp Conversations</CardTitle>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{waConversations.length}</div>
                    <p className="text-xs text-muted-foreground">{visibleWa} visible · {waConversations.length - visibleWa} hidden</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Call Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{fmtDuration(totalDuration)}</div>
                    <p className="text-xs text-muted-foreground">Avg {fmtDuration(totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0)} / call</p>
                  </CardContent>
                </Card>
              </div>

              {/* Assigned agents */}
              <div className="grid gap-4 md:grid-cols-3">
                {chatbots.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> Assigned Chatbots</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {chatbots.map(cb => {
                        const count = conversations.filter(c => c.chatbot_id === cb.id).length;
                        return (
                          <div key={cb.id} className="flex items-center justify-between">
                            <span className="text-sm">{cb.name}</span>
                            <Badge variant="secondary">{count} convs</Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
                {assistants.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> Voice Assistants</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {assistants.map(a => {
                        const count = calls.filter(c => c.assistant_name === a.name).length;
                        return (
                          <div key={a.id} className="flex items-center justify-between">
                            <span className="text-sm">{a.name}</span>
                            <Badge variant="secondary">{count} calls</Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
                {waAgents.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp Agents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {waAgents.map(a => {
                        const count = waConversations.filter(c => c.agent_id === a.id).length;
                        return (
                          <div key={a.id} className="flex items-center justify-between">
                            <span className="text-sm">{a.name}</span>
                            <Badge variant="secondary">{count} convs</Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Leads summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{validLeads.length}</p>
                      <p className="text-xs text-muted-foreground">Total Leads</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{validLeads.filter(l => l.source_type === 'voice').length}</p>
                      <p className="text-xs text-muted-foreground">From Voice</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{validLeads.filter(l => l.source_type === 'chatbot').length}</p>
                      <p className="text-xs text-muted-foreground">From Chatbot</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── CONVERSATIONS ───────────────────────────────────────────────── */}
          {section === 'conversations' && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Conversations</h1>
                  <p className="text-muted-foreground text-sm">{conversations.length} total chatbot conversations</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search…" value={convSearch} onChange={e => setConvSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              {filteredConvs.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">No conversations found</div>
              ) : (
                <div className="space-y-2">
                  {filteredConvs.map(conv => (
                    <Card
                      key={conv.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary"
                      onClick={() => { setSelectedConv(conv); loadConvMessages(conv.id); setShowConvDetail(true); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm">{conv.chatbot_name}</span>
                              <Badge variant="secondary" className="text-xs">{conv.message_count} msgs</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_sender === 'user' ? '👤 ' : '🤖 '}{truncate(conv.last_message, 100)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{fmt(conv.last_message_time)}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VOICE CALLS ─────────────────────────────────────────────────── */}
          {section === 'calls' && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Voice Calls</h1>
                  <p className="text-muted-foreground text-sm">{calls.length} total calls · {visibleCalls} visible in portal</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by phone or assistant…" value={callSearch} onChange={e => setCallSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              {filteredCalls.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">No calls found</div>
              ) : (
                <div className="space-y-2">
                  {filteredCalls.map(call => (
                    <Card
                      key={call.id}
                      className={`cursor-pointer hover:bg-accent/50 transition-colors border-l-4 ${call.hidden_from_portal ? 'border-l-muted opacity-60' : 'border-l-primary'}`}
                      onClick={() => { setSelectedCall(call); loadTranscripts(call.id); setShowCallDetail(true); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm">{call.assistant_name}</span>
                              <Badge variant={call.status === 'completed' ? 'default' : 'secondary'} className="text-xs">{call.status}</Badge>
                              {call.hidden_from_portal && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden from portal</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {call.started_at && (
                                <>
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(call.started_at), 'MMM d, yyyy')}</span>
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(call.started_at), 'h:mm a')}</span>
                                </>
                              )}
                              {call.phone_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{call.phone_number}</span>}
                              {call.duration_seconds > 0 && <span>{fmtDuration(call.duration_seconds)}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── WHATSAPP ─────────────────────────────────────────────────────── */}
          {section === 'whatsapp' && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">WhatsApp Conversations</h1>
                  <p className="text-muted-foreground text-sm">{waConversations.length} total · {visibleWa} visible in portal</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by phone or agent…" value={waSearch} onChange={e => setWaSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
              {filteredWa.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">No conversations found</div>
              ) : (
                <div className="space-y-2">
                  {filteredWa.map(conv => (
                    <Card
                      key={conv.id}
                      className={`cursor-pointer hover:bg-accent/50 transition-colors border-l-4 ${conv.hidden_from_portal ? 'border-l-muted opacity-60' : 'border-l-green-500'}`}
                      onClick={() => { setSelectedWa(conv); setShowWaDetail(true); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <MessageCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="font-medium text-sm">{conv.phone_number || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">via {conv.agent_name}</span>
                              <Badge variant={conv.status === 'done' ? 'default' : 'secondary'} className="text-xs">{conv.status}</Badge>
                              {conv.hidden_from_portal && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden from portal</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {conv.started_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(conv.started_at), 'MMM d, yyyy · h:mm a')}</span>}
                              {conv.duration_seconds != null && <span>{fmtDuration(conv.duration_seconds)}</span>}
                            </div>
                            {conv.summary && <p className="text-xs text-muted-foreground truncate">{conv.summary}</p>}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LEADS ────────────────────────────────────────────────────────── */}
          {section === 'leads' && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Leads</h1>
                  <p className="text-muted-foreground text-sm">{validLeads.length} qualified leads</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search leads…" value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="pl-9" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 mb-2">
                {[
                  { label: 'Total Leads', value: validLeads.length },
                  { label: 'From Voice', value: validLeads.filter(l => l.source_type === 'voice').length },
                  { label: 'From Chatbot', value: validLeads.filter(l => l.source_type === 'chatbot').length },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-2xl font-bold">{s.value}</div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {validLeads.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">No qualified leads found</div>
              ) : (
                <div className="space-y-2">
                  {validLeads.map(lead => (
                    <Card key={lead.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <User className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm">{lead.name}</span>
                              <Badge variant={lead.source_type === 'voice' ? 'secondary' : 'default'} className="text-xs capitalize">{lead.source_type}</Badge>
                              {lead.source_name && <span className="text-xs text-muted-foreground">via {lead.source_name}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                              {(lead.phone_number || lead.additional_data?.caller_id) && (
                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone_number || lead.additional_data?.caller_id}</span>
                              )}
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(lead.extracted_at)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── Conversation Detail Sheet ──────────────────────────────────────── */}
      <Sheet open={showConvDetail} onOpenChange={setShowConvDetail}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <SheetTitle>{selectedConv?.chatbot_name}</SheetTitle>
            <SheetDescription>{selectedConv?.message_count} messages · {fmt(selectedConv?.last_message_time || null)}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : convMessages.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No messages</p>
            ) : (
              <div className="space-y-4">
                {convMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                      <p className="text-xs font-medium mb-1 opacity-70">{msg.role === 'assistant' ? '🤖 Assistant' : '👤 User'}</p>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-50 mt-1">{format(new Date(msg.created_at), 'h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Call Detail Sheet ───────────────────────────────────────────────── */}
      <Sheet open={showCallDetail} onOpenChange={setShowCallDetail}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <SheetTitle>{selectedCall?.assistant_name}</SheetTitle>
            <SheetDescription className="space-y-1">
              {selectedCall?.started_at && <span>{format(new Date(selectedCall.started_at), 'MMM d, yyyy · h:mm a')}</span>}
              {selectedCall?.phone_number && <> · {selectedCall.phone_number}</>}
              {selectedCall && selectedCall.duration_seconds > 0 && <> · {fmtDuration(selectedCall.duration_seconds)}</>}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* AI Insights */}
              {selectedCall && (selectedCall.summary || (selectedCall.key_points && selectedCall.key_points.length > 0) || (selectedCall.action_items && selectedCall.action_items.length > 0)) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-sm font-semibold">AI Insights</h3>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/30">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key Details</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {selectedCall.key_points?.[0] && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Caller Intent</p>
                          <p className="text-sm">{selectedCall.key_points[0]}</p>
                        </div>
                      )}
                      {selectedCall.summary && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Summary</p>
                          <p className="text-sm">{selectedCall.summary}</p>
                        </div>
                      )}
                      {selectedCall.action_items && selectedCall.action_items.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Next Steps</p>
                          <ul className="text-sm space-y-1">
                            {selectedCall.action_items.map((item, i) => (
                              <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>{item}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Info */}
              {selectedCall?.lead_info && (selectedCall.lead_info.name || selectedCall.lead_info.email || selectedCall.lead_info.phone) && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead Information</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {selectedCall.lead_info.name && <div className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground w-12">Name</span><span>{selectedCall.lead_info.name}</span></div>}
                    {selectedCall.lead_info.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground w-12">Phone</span><span>{selectedCall.lead_info.phone}</span></div>}
                    {selectedCall.lead_info.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground w-12">Email</span><span>{selectedCall.lead_info.email}</span></div>}
                  </div>
                </div>
              )}

              {/* Recording */}
              {selectedCall?.recording_url && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    <h3 className="font-semibold text-sm">Recording</h3>
                  </div>
                  <audio controls className="w-full">
                    <source src={selectedCall.recording_url} type="audio/wav" />
                  </audio>
                </div>
              )}

              {/* Transcript */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h3 className="font-semibold text-sm">Transcript</h3>
                </div>
                {loadingTranscripts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : transcripts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No transcript available</p>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map(t => (
                      <div key={t.id} className={`flex gap-3 ${t.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${t.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                          <p className="text-xs font-medium mb-1 opacity-70">{t.role === 'assistant' ? 'Assistant' : 'User'}</p>
                          <p className="text-sm">{t.content}</p>
                          <p className="text-xs opacity-50 mt-1">{format(new Date(t.timestamp), 'h:mm:ss a')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── WhatsApp Detail Sheet ───────────────────────────────────────────── */}
      <Sheet open={showWaDetail} onOpenChange={setShowWaDetail}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <SheetTitle>{selectedWa?.phone_number || 'Unknown Contact'}</SheetTitle>
            <SheetDescription>via {selectedWa?.agent_name} · {selectedWa?.started_at ? format(new Date(selectedWa.started_at), 'MMM d, yyyy · h:mm a') : '—'}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            {selectedWa && (
              <div className="space-y-6">
                {/* AI Insights */}
                {(selectedWa.summary || (selectedWa.key_points && selectedWa.key_points.length > 0) || (selectedWa.action_items && selectedWa.action_items.length > 0)) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <h3 className="text-sm font-semibold">AI Insights</h3>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-muted/30">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversation Summary</span>
                      </div>
                      <div className="p-3 space-y-3">
                        {selectedWa.summary && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Summary</p>
                            <p className="text-sm">{selectedWa.summary}</p>
                          </div>
                        )}
                        {selectedWa.key_points && selectedWa.key_points.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Key Points</p>
                            <ul className="text-sm space-y-1">
                              {selectedWa.key_points.map((p, i) => <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>{p}</span></li>)}
                            </ul>
                          </div>
                        )}
                        {selectedWa.action_items && selectedWa.action_items.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Next Steps</p>
                            <ul className="text-sm space-y-1">
                              {selectedWa.action_items.map((a, i) => <li key={i} className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span><span>{a}</span></li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lead Info */}
                {selectedWa.lead_info && (selectedWa.lead_info.name || selectedWa.lead_info.email || selectedWa.lead_info.phone) && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-muted/30">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead Information</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {selectedWa.lead_info.name && <div className="flex items-center gap-2 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground w-12">Name</span><span>{selectedWa.lead_info.name}</span></div>}
                      {selectedWa.lead_info.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground w-12">Phone</span><span>{selectedWa.lead_info.phone}</span></div>}
                      {selectedWa.lead_info.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground w-12">Email</span><span>{selectedWa.lead_info.email}</span></div>}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-3">
                  <Badge variant={selectedWa.status === 'done' ? 'default' : 'secondary'} className="capitalize">{selectedWa.status}</Badge>
                  {selectedWa.hidden_from_portal && <Badge variant="outline" className="text-muted-foreground">Hidden from portal</Badge>}
                  {selectedWa.sentiment && <Badge variant="outline" className="capitalize">{selectedWa.sentiment}</Badge>}
                  {selectedWa.duration_seconds != null && <span className="text-sm text-muted-foreground">{fmtDuration(selectedWa.duration_seconds)}</span>}
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

    </div>
  );
}
