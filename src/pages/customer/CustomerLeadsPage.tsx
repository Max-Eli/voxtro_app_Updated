import { useState, useEffect } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Bot, Phone, MessageCircle, Search, Mail, User, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { extractLeads as extractLeadsAPI } from '@/integrations/api/endpoints';

interface Lead {
  id: string;
  source_type: string;
  source_name: string | null;
  conversation_id: string;
  phone_number: string | null;
  email: string | null;
  name: string | null;
  additional_data: Record<string, string>;
  extracted_at: string;
}

export default function CustomerLeadsPage() {
  const { customer } = useCustomerAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  useEffect(() => {
    if (customer) {
      fetchLeads();
    }
  }, [customer]);

  const fetchLeads = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      const allLeads: Lead[] = [];

      // Fetch leads for chatbots assigned to this customer
      const { data: chatbotAssignments } = await supabase
        .from('customer_chatbot_assignments')
        .select('chatbot_id')
        .eq('customer_id', customer.id);

      if (chatbotAssignments && chatbotAssignments.length > 0) {
        const chatbotIds = chatbotAssignments.map(a => a.chatbot_id);
        
        const { data: chatbotLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('source_type', 'chatbot')
          .in('source_id', chatbotIds)
          .order('extracted_at', { ascending: false });

        if (chatbotLeads) {
          allLeads.push(...chatbotLeads.map(l => ({
            ...l,
            additional_data: (l.additional_data as Record<string, string>) || {}
          })));
        }
      }

      // Fetch leads for voice assistants assigned to this customer
      const { data: voiceAssignments } = await supabase
        .from('customer_assistant_assignments')
        .select('assistant_id')
        .eq('customer_id', customer.id);

      if (voiceAssignments && voiceAssignments.length > 0) {
        const assistantIds = voiceAssignments.map(a => a.assistant_id);
        
        const { data: voiceLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('source_type', 'voice')
          .in('source_id', assistantIds)
          .order('extracted_at', { ascending: false });

        if (voiceLeads) {
          allLeads.push(...voiceLeads.map(l => ({
            ...l,
            additional_data: (l.additional_data as Record<string, string>) || {}
          })));
        }
      }

      // Fetch leads for WhatsApp agents assigned to this customer
      const { data: whatsappAssignments } = await supabase
        .from('customer_whatsapp_agent_assignments')
        .select('agent_id')
        .eq('customer_id', customer.id);

      if (whatsappAssignments && whatsappAssignments.length > 0) {
        const agentIds = whatsappAssignments.map(a => a.agent_id);
        
        const { data: whatsappLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('source_type', 'whatsapp')
          .in('source_id', agentIds)
          .order('extracted_at', { ascending: false });

        if (whatsappLeads) {
          allLeads.push(...whatsappLeads.map(l => ({
            ...l,
            additional_data: (l.additional_data as Record<string, string>) || {}
          })));
        }
      }

      // Sort by date descending
      allLeads.sort((a, b) => new Date(b.extracted_at).getTime() - new Date(a.extracted_at).getTime());
      setLeads(allLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const extractLeads = async () => {
    if (!customer) return;

    setExtracting(true);
    try {
      const data = await extractLeadsAPI({
        customerId: customer.id
      });

      toast.success(data.message || 'Leads extracted successfully');
      await fetchLeads(); // Refresh the leads list
    } catch (error) {
      console.error('Error extracting leads:', error);
      toast.error('Failed to extract leads');
    } finally {
      setExtracting(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSource = sourceFilter === 'all' || lead.source_type === sourceFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      (lead.name?.toLowerCase().includes(searchLower)) ||
      (lead.email?.toLowerCase().includes(searchLower)) ||
      (lead.phone_number?.includes(searchQuery)) ||
      (lead.source_name?.toLowerCase().includes(searchLower));
    return matchesSource && matchesSearch;
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'chatbot': return <Bot className="h-4 w-4" />;
      case 'voice': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'chatbot': return 'default';
      case 'voice': return 'secondary';
      case 'whatsapp': return 'outline';
      default: return 'default';
    }
  };

  const stats = {
    total: leads.length,
    chatbot: leads.filter(l => l.source_type === 'chatbot').length,
    voice: leads.filter(l => l.source_type === 'voice').length,
    whatsapp: leads.filter(l => l.source_type === 'whatsapp').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            View extracted lead data from your agents
          </p>
        </div>
        <Button onClick={extractLeads} disabled={extracting}>
          <RefreshCw className={`h-4 w-4 mr-2 ${extracting ? 'animate-spin' : ''}`} />
          {extracting ? 'Extracting...' : 'Extract Leads'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Chatbots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.chatbot}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Voice</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.voice}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From WhatsApp</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.whatsapp}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            Browse and search through all extracted lead information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="chatbot">Chatbots</SelectItem>
                <SelectItem value="voice">Voice Assistants</SelectItem>
                <SelectItem value="whatsapp">WhatsApp Agents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading leads...</div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No leads found</h3>
              <p className="text-muted-foreground mt-1">
                {leads.length === 0 
                  ? "Leads will appear here as your agents collect contact information."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Badge variant={getSourceBadgeVariant(lead.source_type) as any} className="gap-1">
                          {getSourceIcon(lead.source_type)}
                          <span className="capitalize">{lead.source_type}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{lead.source_name || 'Unknown'}</TableCell>
                      <TableCell>
                        {lead.name ? (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{lead.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone_number && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{lead.phone_number}</span>
                            </div>
                          )}
                          {!lead.email && !lead.phone_number && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lead.extracted_at), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
