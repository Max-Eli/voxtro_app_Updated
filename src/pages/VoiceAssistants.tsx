import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, RefreshCw, UserPlus, Trash2, Mic2, MessageCircle, Users2, Sparkles, Settings2, Phone, ChevronRight, Search } from 'lucide-react';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { Input } from '@/components/ui/input';
import { QuickTaskForm } from '@/components/tasks/QuickTaskForm';
import { syncVoiceAssistants } from '@/integrations/api/endpoints';

interface VoiceAssistant {
  id: string;
  name: string;
  first_message?: string;
  voice_provider?: string;
  voice_id?: string;
  model_provider?: string;
  model?: string;
  transcriber_provider?: string;
  phone_number?: string;
  org_id?: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
}

interface AssignmentWithCustomer {
  id: string;
  assistant_id: string;
  customer: Customer;
}

export default function VoiceAssistants() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assistants, setAssistants] = useState<VoiceAssistant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  // Auto-sync on page load and periodic refresh
  const performAutoSync = async () => {
    if (syncing) return; // Prevent concurrent syncs

    setSyncing(true);
    try {
      const data = await syncVoiceAssistants();
      console.log(`Auto-synced ${data?.count || 0} voice assistants`);
    } catch (error) {
      console.error('Auto-sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveConnection();
    }
  }, [user]);

  // Fetch assistants when org changes and auto-sync on initial load
  useEffect(() => {
    if (user && activeOrgId !== null) {
      // Auto-sync on initial load
      performAutoSync().then(() => fetchData());
      
      // Set up periodic auto-sync every 2 minutes
      const syncInterval = setInterval(() => {
        performAutoSync().then(() => fetchData());
      }, 120000);
      
      return () => clearInterval(syncInterval);
    }
  }, [user, activeOrgId]);

  const fetchActiveConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_connections')
        .select('org_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setActiveOrgId(data?.org_id || '');
    } catch (error) {
      console.error('Error fetching active connection:', error);
      setActiveOrgId('');
    }
  };

  const handleOrgSwitch = async () => {
    setSelectedAssistantId(null);
    await fetchActiveConnection();
    // Auto-sync after switching orgs
    setSyncing(true);
    try {
      const data = await syncVoiceAssistants();
      toast.success(`Synced ${data.count} assistants`);
    } catch (error) {
      console.error('Error syncing assistants:', error);
      toast.error('Failed to sync assistants');
    } finally {
      setSyncing(false);
    }
  };

  // Auto-select first assistant when data loads
  useEffect(() => {
    if (assistants.length > 0 && !selectedAssistantId) {
      setSelectedAssistantId(assistants[0].id);
    }
  }, [assistants, selectedAssistantId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // RLS policies handle access control - allow team members to see teammate's assistants
      // We'll filter in-memory to include those with matching org_id OR null org_id (for backwards compat)
      const { data: allAssistantsData, error: assistantsError } = await supabase
        .from('voice_assistants')
        .select('*')
        .order('created_at', { ascending: false });

      if (assistantsError) throw assistantsError;

      // Filter by org_id if we have one, but also include assistants with NULL org_id
      // This provides backwards compatibility until all assistants are synced with proper org_id
      let assistantsData = allAssistantsData || [];
      if (activeOrgId) {
        assistantsData = assistantsData.filter(
          a => a.org_id === activeOrgId || a.org_id === null
        );
      }
      setAssistants(assistantsData);

      // Fetch ALL customers visible to the user (RLS handles visibility)
      // This includes customers created by the user AND their teammates
      const { data: customersData } = await supabase
        .from('customers')
        .select('*');

      setCustomers(customersData || []);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('customer_assistant_assignments')
        .select(`
          id,
          assistant_id,
          customers (
            id,
            email,
            full_name,
            company_name
          )
        `)
        .eq('assigned_by', user?.id);

      if (assignmentsError) throw assignmentsError;
      
      const formattedAssignments = assignmentsData
        ?.filter(a => a.customers != null) // Filter out assignments with deleted customers
        ?.map(a => ({
          id: a.id,
          assistant_id: a.assistant_id,
          customer: a.customers as unknown as Customer
        })) || [];

      setAssignments(formattedAssignments);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAssistants = async () => {
    setSyncing(true);
    try {
      const data = await syncVoiceAssistants();

      toast.success(`Synced ${data.count} assistants`);
      await fetchData();
    } catch (error) {
      console.error('Error syncing assistants:', error);
      toast.error('Failed to sync assistants');
    } finally {
      setSyncing(false);
    }
  };

  const handleAssignAssistant = async () => {
    if (!selectedAssistantId || !selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_assistant_assignments')
        .insert({
          customer_id: selectedCustomer,
          assistant_id: selectedAssistantId,
          assigned_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This customer is already assigned to this assistant');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Assistant assigned successfully');
      setShowAssignDialog(false);
      setSelectedCustomer('');
      await fetchData();
    } catch (error) {
      console.error('Error assigning assistant:', error);
      toast.error('Failed to assign assistant');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('customer_assistant_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Assignment removed');
      await fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);
  const selectedAssignments = assignments.filter(a => a.assistant_id === selectedAssistantId);

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
      {/* Sidebar - Assistant List */}
      <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Mic2 className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Voice Assistants</h1>
          </div>
          <div className="flex items-center gap-2">
            <OrganizationSwitcher onSwitch={handleOrgSwitch} compact />
            <Button onClick={handleSyncAssistants} disabled={syncing} size="sm" variant="outline" className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing' : 'Sync'}
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assistants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Assistant List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {(() => {
              const filteredAssistants = assistants.filter(a => 
                a.name?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              if (filteredAssistants.length === 0) {
                return (
                  <div className="text-center py-8 px-4">
                    <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No matching assistants' : 'No assistants found'}
                    </p>
                    {!searchQuery && (
                      <p className="text-xs text-muted-foreground mt-1">Click Sync to fetch your assistants</p>
                    )}
                  </div>
                );
              }
              
              return filteredAssistants.map((assistant) => {
                const assignmentCount = assignments.filter(a => a.assistant_id === assistant.id).length;
                const isSelected = selectedAssistantId === assistant.id;
                
                return (
                  <button
                    key={assistant.id}
                    onClick={() => setSelectedAssistantId(assistant.id)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                          {assistant.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {assistant.model_provider && (
                            <span className="text-xs text-muted-foreground truncate">
                              {assistant.model_provider}
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
              });
            })()}
          </div>
        </ScrollArea>

        {/* Sidebar Footer Stats */}
        {assistants.length > 0 && (
          <div className="p-3 border-t border-border bg-background/50">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{assistants.length} assistants</span>
              <span>{assignments.length} assignments</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Assistant Details */}
      <div className="flex-1 overflow-auto">
        {selectedAssistant ? (
          <div className="p-6 max-w-3xl">
            {/* Assistant Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{selectedAssistant.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {new Date(selectedAssistant.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/voice-assistants/${selectedAssistant.id}/edit`)}
                  className="gap-1.5"
                >
                  <Settings2 className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Quick Add Task */}
            <div className="mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick Add Task</p>
              <QuickTaskForm
                assistantId={selectedAssistant.id}
                assistantName={selectedAssistant.name}
                orgId={activeOrgId}
                placeholder="Add a task and press Enter..."
              />
            </div>

            {/* First Message */}
            {selectedAssistant.first_message && (
              <Card className="mb-6">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">First Message</p>
                      <p className="text-sm italic">"{selectedAssistant.first_message}"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Configuration */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Configuration</h3>
              <div className="grid grid-cols-2 gap-3">
                {selectedAssistant.voice_provider && (
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2">
                        <Mic2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Voice</p>
                          <p className="text-sm font-medium">{selectedAssistant.voice_provider}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {selectedAssistant.model_provider && (
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Model</p>
                          <p className="text-sm font-medium">
                            {selectedAssistant.model_provider}
                            {selectedAssistant.model && ` • ${selectedAssistant.model}`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {selectedAssistant.transcriber_provider && (
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Transcriber</p>
                          <p className="text-sm font-medium">{selectedAssistant.transcriber_provider}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {selectedAssistant.phone_number && (
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone Number</p>
                          <p className="text-sm font-medium font-mono">{selectedAssistant.phone_number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Assigned Customers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Assigned Customers</h3>
                  <Badge variant="secondary" className="text-xs">{selectedAssignments.length}</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                  className="gap-1.5"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign
                </Button>
              </div>

              {selectedAssignments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <Users2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No customers assigned yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Assign customers to give them access to this assistant</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {selectedAssignments.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {assignment.customer?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{assignment.customer?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{assignment.customer?.email || 'No email'}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select an assistant to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Assign Customer
            </DialogTitle>
            <DialogDescription>
              Select a customer to give them access to {selectedAssistant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No customers available
                  </div>
                ) : (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customer.full_name}</span>
                        <span className="text-muted-foreground">({customer.email})</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAssignAssistant} disabled={!selectedCustomer} className="flex-1">
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
