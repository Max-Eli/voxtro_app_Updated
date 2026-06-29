import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Search,
  RefreshCcw,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Link2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Users, UserCheck } from "lucide-react";
import { smsAgentsApi, type SmsMessage, type SmsPlatformAgent } from "@/integrations/api/endpoints/smsAgents";

interface SmsConnectionRow {
  id: string;
  org_name: string | null;
  is_active: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

interface ConversationGroup {
  conversationId: string;
  contactNumber: string | null;
  agentName: string;
  messages: SmsMessage[];
  lastMessageAt: string;
  lastMessagePreview: string;
}

function groupByConversation(messages: SmsMessage[]): ConversationGroup[] {
  const map = new Map<string, ConversationGroup>();
  for (const m of messages) {
    const key = m.conversation_id ?? `agent:${m.sms_agent_id}:${m.contact_number ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.messages.push(m);
      if (m.created_at > existing.lastMessageAt) {
        existing.lastMessageAt = m.created_at;
        existing.lastMessagePreview = m.content.slice(0, 120);
      }
    } else {
      map.set(key, {
        conversationId: key,
        contactNumber: m.contact_number,
        agentName: m.agent_name,
        messages: [m],
        lastMessageAt: m.created_at,
        lastMessagePreview: m.content.slice(0, 120),
      });
    }
  }
  const groups = Array.from(map.values());
  for (const g of groups) g.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  groups.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  return groups;
}

interface AdminCustomerRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
}

export default function SmsAgents() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<SmsConnectionRow[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [assignAgent, setAssignAgent] = useState<SmsPlatformAgent | null>(null);

  // Load the admin's saved SMS connections from Supabase directly (RLS handles scoping)
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingConnections(true);
      const { data, error } = await supabase
        .from("sms_connections")
        .select("id, org_name, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (!error && data) {
        setConnections(data as SmsConnectionRow[]);
        if (data.length > 0 && !selectedConnId) {
          setSelectedConnId(data[0].id);
        }
      }
      setLoadingConnections(false);
    })();
  }, [user, selectedConnId]);

  // Agents under the selected connection
  const {
    data: agentsData,
    isLoading: agentsLoading,
    refetch: refetchAgents,
    isFetching: agentsFetching,
  } = useQuery({
    queryKey: ["sms-platform-agents", selectedConnId],
    queryFn: () => smsAgentsApi.listPlatformAgents(selectedConnId!),
    enabled: !!selectedConnId,
  });

  const agents: SmsPlatformAgent[] = agentsData?.agents ?? [];

  // Auto-select first agent on connection change
  useEffect(() => {
    if (agents.length > 0 && !agents.some((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(agents[0].id);
    } else if (agents.length === 0) {
      setSelectedAgentId(null);
    }
  }, [agents, selectedAgentId]);

  // Messages for the selected agent
  const {
    data: messagesData,
    isLoading: messagesLoading,
    isFetching: messagesFetching,
  } = useQuery({
    queryKey: ["sms-platform-messages", selectedConnId, selectedAgentId],
    queryFn: () =>
      smsAgentsApi.listPlatformMessages({
        connection_id: selectedConnId!,
        agent_id: selectedAgentId ?? undefined,
        limit: 200,
      }),
    enabled: !!selectedConnId && !!selectedAgentId,
  });

  const messages = messagesData?.messages ?? [];
  const conversations = useMemo(() => {
    const groups = groupByConversation(messages);
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups.filter(
      (g) =>
        (g.contactNumber ?? "").toLowerCase().includes(q) ||
        g.agentName.toLowerCase().includes(q) ||
        g.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [messages, search]);

  const selected = conversations.find((c) => c.conversationId === selectedConvId) ?? null;

  // ── Empty state: admin hasn't added a connection yet ────────────
  if (!loadingConnections && connections.length === 0) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Agents
          </h1>
        </header>
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Link2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-base font-medium">No SMS connection yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add your build.voxtro.io API key under <strong>Settings → API Connections → SMS Platform</strong>{" "}
              to start viewing your SMS agents and message logs here.
            </p>
            <div className="pt-2">
              <Button asChild size="sm">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Open Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-6 space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View your build.voxtro.io SMS agents and their conversation logs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {connections.length > 1 && (
            <Select
              value={selectedConnId ?? undefined}
              onValueChange={(v) => { setSelectedConnId(v); setSelectedAgentId(null); setSelectedConvId(null); }}
            >
              <SelectTrigger className="h-9 w-56 text-sm">
                <SelectValue placeholder="Choose connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.org_name || "Unnamed connection"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline" size="sm"
            onClick={() => { refetchAgents(); }}
            disabled={agentsFetching}
            className="gap-1.5"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${agentsFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {agentsData?.error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            {agentsData.error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(260px,1fr)_minmax(0,2fr)] gap-4">
        {/* ── Agents list ───────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Agents
            </div>
            <ScrollArea className="h-[calc(100vh-18rem)] min-h-[300px]">
              {agentsLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : agents.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No agents in this connection.
                </div>
              ) : (
                <ul className="divide-y">
                  {agents.map((a) => {
                    const active = a.id === selectedAgentId;
                    return (
                      <li key={a.id}>
                        <div
                          className={`flex items-center gap-1 px-3 py-2 hover:bg-muted/50 transition-colors ${active ? "bg-muted/70" : ""}`}
                        >
                          <button
                            onClick={() => { setSelectedAgentId(a.id); setSelectedConvId(null); }}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-medium truncate">{a.name}</p>
                            {!a.is_active && (
                              <Badge variant="outline" className="text-[10px] h-4 mt-1">disabled</Badge>
                            )}
                          </button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setAssignAgent(a)}
                            title="Manage customer assignments"
                            className="h-7 w-7 shrink-0"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Conversations list ────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversations</span>
              {messagesFetching && <RefreshCcw className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search number or message…"
                  className="pl-7 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-22rem)] min-h-[260px]">
              {!selectedAgentId ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Select an agent on the left.</div>
              ) : messagesLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {search.trim() ? "No conversations match your search." : "No SMS conversations for this agent yet."}
                </div>
              ) : (
                <ul className="divide-y">
                  {conversations.map((c) => {
                    const active = c.conversationId === selectedConvId;
                    return (
                      <li key={c.conversationId}>
                        <button
                          onClick={() => setSelectedConvId(c.conversationId)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${active ? "bg-muted/70" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate">{c.contactNumber ?? "Unknown"}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDate(c.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.lastMessagePreview}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.messages.length} msgs</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Message thread ────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)] min-h-[300px]">
              {!selected ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Select a conversation to view its message history.
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="border-b pb-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selected.contactNumber ?? "Unknown number"}</span>
                      <Badge variant="outline">{selected.agentName}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selected.messages.length} message{selected.messages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {selected.messages.map((m) => {
                    const inbound = m.direction === "inbound";
                    return (
                      <div key={m.id} className={`flex gap-2 ${inbound ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            inbound ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                            {inbound ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            <span>{inbound ? "From contact" : "From agent"}</span>
                            <span>·</span>
                            <span>{formatDate(m.created_at)}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AssignToCustomersDialog
        agent={assignAgent}
        connectionId={selectedConnId}
        onClose={() => setAssignAgent(null)}
      />
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Dialog: attach this SMS agent to one or more of the admin's customers.
// Reads + writes customer_sms_agent_assignments directly via Supabase — RLS
// already restricts to assigned_by = auth.uid().
// ─────────────────────────────────────────────────────────────────────────────
function AssignToCustomersDialog({
  agent, connectionId, onClose,
}: {
  agent: SmsPlatformAgent | null;
  connectionId: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const open = !!agent;
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [originallyAssigned, setOriginallyAssigned] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user || !agent) return;
    (async () => {
      setLoading(true);
      try {
        // Admin's own customers
        const { data: custData } = await supabase
          .from("customers")
          .select("id, full_name, company_name, email")
          .eq("created_by_user_id", user.id)
          .order("full_name", { ascending: true });

        // Current assignments of THIS agent (across this admin's customers).
        // RLS scopes to assigned_by = auth.uid(); also belt-and-suspenders by user.id.
        const { data: assignData } = await supabase
          .from("customer_sms_agent_assignments")
          .select("customer_id")
          .eq("sms_agent_id", agent.id)
          .eq("assigned_by", user.id);

        const ids = new Set<string>((assignData ?? []).map((r) => r.customer_id as string));
        setCustomers((custData ?? []) as AdminCustomerRow[]);
        setOriginallyAssigned(ids);
        setSelected(new Set(ids));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user, agent]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || !agent) return;
    if (!connectionId) {
      toast({
        title: "No connection selected",
        description: "Pick a connection at the top of the page before assigning.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const toAdd = [...selected].filter((id) => !originallyAssigned.has(id));
      const toRemove = [...originallyAssigned].filter((id) => !selected.has(id));

      if (toAdd.length > 0) {
        const { error } = await supabase.from("customer_sms_agent_assignments").insert(
          toAdd.map((customer_id) => ({
            customer_id,
            sms_agent_id: agent.id,
            agent_name: agent.name,
            sms_connection_id: connectionId,
            assigned_by: user.id,
          }))
        );
        if (error) throw error;
      }

      for (const customer_id of toRemove) {
        const { error } = await supabase
          .from("customer_sms_agent_assignments")
          .delete()
          .eq("customer_id", customer_id)
          .eq("sms_agent_id", agent.id)
          .eq("assigned_by", user.id);
        if (error) throw error;
      }

      toast({
        title: "Assignments updated",
        description: `${toAdd.length} added, ${toRemove.length} removed.`,
      });
      onClose();
    } catch (e: any) {
      console.error("SMS assignment save error:", e);
      toast({
        title: "Save failed",
        description: e?.message ?? "Could not update assignments",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign "{agent?.name}" to customers</DialogTitle>
          <DialogDescription>
            Pick which of your customers should see this SMS agent in their portal.
            Removing a tick will unassign it.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] -mx-1 px-1">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              You haven't created any customers yet.
            </p>
          ) : (
            <ul className="space-y-1 py-1">
              {customers.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex items-start gap-2 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(c.id)} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {c.full_name || c.email || "Unnamed customer"}
                          </span>
                          {originallyAssigned.has(c.id) && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                              assigned
                            </Badge>
                          )}
                        </div>
                        {c.company_name && (
                          <p className="text-xs text-muted-foreground truncate">{c.company_name}</p>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
