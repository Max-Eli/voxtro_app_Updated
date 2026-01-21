import { useState, useEffect } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Ticket, Clock, CheckCircle2, AlertCircle, MessageSquare, Calendar, RefreshCw, Send, Plus } from "lucide-react";
import { format } from "date-fns";
import { CreateTicketDialog } from "@/components/customer/CreateTicketDialog";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  user_id: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  content: string;
  sender_type: "customer" | "agent";
  sender_name: string;
  created_at: string;
}

export default function CustomerSupportTicketsPage() {
  const { customer, loading: authLoading } = useCustomerAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    if (!customer) return;

    try {
      setLoading(true);

      // Fetch tickets for this customer (by email)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("customer_email", customer.email)
        .order("created_at", { ascending: false });

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        toast.error("Failed to load support tickets");
        return;
      }

      // Fetch messages for each ticket
      const ticketsWithMessages: SupportTicket[] = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: messagesData } = await supabase
            .from("support_ticket_messages")
            .select("*")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: true });

          return {
            ...ticket,
            messages: (messagesData || []).map((msg) => ({
              id: msg.id,
              content: msg.content,
              sender_type: msg.sender_type as "customer" | "agent",
              sender_name: msg.sender_name,
              created_at: msg.created_at,
            })),
          } as SupportTicket;
        })
      );

      setTickets(ticketsWithMessages);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customer) {
      fetchTickets();

      // Set up real-time subscription for messages
      const channel = supabase
        .channel("customer-ticket-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_ticket_messages",
          },
          () => {
            fetchTickets();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [customer]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/customer-login" replace />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "closed":
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };
    return (
      <Badge className={`${colors[priority] || ""} capitalize`} variant="outline">
        {priority}
      </Badge>
    );
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const { data: newMessage, error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          content: replyContent,
          sender_type: "customer",
          sender_name: customer.full_name,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to send reply");
        return;
      }

      const message: TicketMessage = {
        id: newMessage.id,
        content: newMessage.content,
        sender_type: newMessage.sender_type as "customer" | "agent",
        sender_name: newMessage.sender_name,
        created_at: newMessage.created_at,
      };

      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, messages: [...t.messages, message], updated_at: new Date().toISOString() }
            : t
        )
      );
      setSelectedTicket((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : null));
      setReplyContent("");
      toast.success("Reply sent successfully");

      // Send admin notification email
      try {
        // Fetch admin email from profiles
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", selectedTicket.user_id)
          .single();

        if (profileData?.email) {
          await supabase.functions.invoke("send-admin-ticket-notification", {
            body: {
              ticket_id: selectedTicket.id,
              ticket_subject: selectedTicket.subject,
              customer_email: customer.email,
              customer_name: customer.full_name,
              reply_content: replyContent,
              admin_email: profileData.email,
            },
          });
        }
      } catch (notificationError) {
        console.error("Failed to send admin notification:", notificationError);
        // Don't show error to user - notification is not critical
      }
    } finally {
      setSendingReply(false);
    }
  };

  const openTicketsCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Support Tickets</h1>
          <p className="text-muted-foreground mt-1">View and respond to your support requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTickets} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <CreateTicketDialog
            customerId={customer.id}
            customerName={customer.full_name}
            customerEmail={customer.email}
            onTicketCreated={fetchTickets}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
                <p className="text-2xl font-bold">{tickets.length}</p>
              </div>
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-blue-600">{openTicketsCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {tickets.filter((t) => t.status === "resolved" || t.status === "closed").length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tickets</CardTitle>
          <CardDescription>Click on a ticket to view details and respond</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No tickets yet</h3>
              <p className="text-muted-foreground mb-4">
                Need help? Create a support ticket and we'll get back to you.
              </p>
              <CreateTicketDialog
                customerId={customer.id}
                customerName={customer.full_name}
                customerEmail={customer.email}
                onTicketCreated={fetchTickets}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Ticket
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(ticket.status)}
                        <h4 className="font-medium truncate">{ticket.subject}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{ticket.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(ticket.created_at), "MMM d, h:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {ticket.messages.length} messages
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle>{selectedTicket.subject}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Created on {format(new Date(selectedTicket.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <Separator />

                {/* Messages */}
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {selectedTicket.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.sender_type === "customer"
                            ? "bg-primary/10 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {message.sender_type === "customer" ? "You" : message.sender_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Form - only show for non-closed tickets */}
                {selectedTicket.status !== "closed" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button onClick={handleReply} disabled={sendingReply || !replyContent.trim()}>
                          <Send className="h-4 w-4 mr-2" />
                          {sendingReply ? "Sending..." : "Send Reply"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {selectedTicket.status === "closed" && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    This ticket is closed. Please create a new ticket if you need further assistance.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
