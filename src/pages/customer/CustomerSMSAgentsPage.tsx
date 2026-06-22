import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Search,
  RefreshCcw,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
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
import { smsAgentsApi, type SmsMessage } from "@/integrations/api/endpoints/smsAgents";

interface ConversationGroup {
  conversationId: string;
  contactNumber: string | null;
  agentId: string;
  agentName: string;
  messages: SmsMessage[];
  lastMessageAt: string;
  lastMessagePreview: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Group flat SMS messages into per-conversation threads, newest conversation first. */
function groupMessagesByConversation(messages: SmsMessage[]): ConversationGroup[] {
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
        agentId: m.sms_agent_id,
        agentName: m.agent_name,
        messages: [m],
        lastMessageAt: m.created_at,
        lastMessagePreview: m.content.slice(0, 120),
      });
    }
  }
  const groups = Array.from(map.values());
  // Within each thread, sort messages oldest→newest for natural reading order
  for (const g of groups) g.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  // Across threads, newest activity first
  groups.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  return groups;
}

export default function CustomerSMSAgentsPage() {
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["sms-messages", agentFilter],
    queryFn: () =>
      smsAgentsApi.listMessages({
        agent_id: agentFilter === "all" ? undefined : agentFilter,
        limit: 200,
      }),
  });

  const assignedAgents = data?.assigned_agents ?? [];
  const messages = data?.messages ?? [];

  const conversations = useMemo(() => {
    const groups = groupMessagesByConversation(messages);
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

  // ── Empty state: no SMS agents assigned to this customer ──────────────
  if (!isLoading && assignedAgents.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View conversation logs from your SMS agents.
          </p>
        </header>
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-base font-medium">No SMS agents are assigned to your account yet.</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Once your administrator assigns an SMS agent, your conversation history will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── SMS platform not configured (env var missing) ────────────────────
  if (data?.error) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Agents
          </h1>
        </header>
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <p className="text-base font-medium">SMS Agents is being set up.</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your administrator hasn't finished connecting the SMS provider yet.
              Once they have, this page will show your message history.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            SMS Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"} across {assignedAgents.length}{" "}
            agent{assignedAgents.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search phone number, agent, or message…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {assignedAgents.length > 1 && (
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-9 w-48 text-sm">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {assignedAgents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] gap-4">
        {/* ── Conversations list ─────────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)] min-h-[300px]">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {search.trim() ? "No conversations match your search." : "No SMS conversations yet."}
                </div>
              ) : (
                <ul className="divide-y">
                  {conversations.map((c) => {
                    const isActive = c.conversationId === selectedConvId;
                    return (
                      <li key={c.conversationId}>
                        <button
                          onClick={() => setSelectedConvId(c.conversationId)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                            isActive ? "bg-muted/70" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {c.contactNumber ?? "Unknown number"}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDate(c.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] h-4">
                              {c.agentName}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {c.messages.length} msg{c.messages.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{c.lastMessagePreview}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Message thread ─────────────────────────────────────────── */}
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
                    const isInbound = m.direction === "inbound";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${isInbound ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            isInbound
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                            {isInbound ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            <span>{isInbound ? "From contact" : "From agent"}</span>
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
    </div>
  );
}
