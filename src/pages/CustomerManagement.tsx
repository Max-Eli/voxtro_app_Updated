import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Mail, Trash2, Settings, Users, Shield, FileCheck, Globe, Search, Bot, Clock, Building2 } from 'lucide-react';
import { createCustomerWithAuth, sendCustomerLoginLink, deleteCustomer, updateCustomerChatbots } from '@/integrations/api/endpoints';
import { CustomerPermissionConfig } from '@/components/CustomerPermissionConfig';
import { PendingContentReview } from '@/components/PendingContentReview';
import { PendingCrawlUrlReview } from '@/components/PendingCrawlUrlReview';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  weekly_summary_enabled: boolean;
  last_login?: string;
  created_at: string;
  created_by_user_id?: string;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
}

interface TeamMember {
  team_org_id: string;
  user_id: string;
  role: string;
}

interface TeamOrganization {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CustomerWithAssignments extends Customer {
  assigned_chatbots: string[];
}

export function CustomerManagement() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithAssignments[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamOrganizations, setTeamOrganizations] = useState<TeamOrganization[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    full_name: '',
    company_name: '',
    password: '',
  });
  const [permissionsCustomer, setPermissionsCustomer] = useState<CustomerWithAssignments | null>(null);
  const [editingChatbotsCustomer, setEditingChatbotsCustomer] = useState<CustomerWithAssignments | null>(null);
  const [editingChatbotIds, setEditingChatbotIds] = useState<string[]>([]);
  const [savingChatbots, setSavingChatbots] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
      fetchTeamData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch chatbots - RLS policies determine visibility (own + teammates' chatbots)
      const { data: chatbotsData, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id, name, description');

      if (chatbotsError) throw chatbotsError;
      setChatbots(chatbotsData || []);

      // Fetch customers - RLS policies determine visibility (own + teammates' customers)
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          customer_chatbot_assignments (
            chatbot_id
          )
        `);

      if (customersError) throw customersError;

      // Map customers with their assigned chatbot IDs (show all assignments for visible chatbots)
      const visibleChatbotIds = chatbotsData?.map(c => c.id) || [];
      const customersWithAssignments = customersData?.map(customer => ({
        ...customer,
        assigned_chatbots: customer.customer_chatbot_assignments
          .filter(assignment => visibleChatbotIds.includes(assignment.chatbot_id))
          .map(assignment => assignment.chatbot_id)
      })) || [];

      setCustomers(customersWithAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamData = async () => {
    if (!user?.id) return;

    try {
      // Fetch team members (all teams the current user is part of)
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('team_org_id, user_id, role')
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      if (membersData && membersData.length > 0) {
        // Get all team IDs
        const teamIds = membersData.map(m => m.team_org_id);

        // Fetch all members of those teams (to get teammate IDs)
        const { data: allTeamMembers, error: allMembersError } = await supabase
          .from('team_members')
          .select('team_org_id, user_id, role')
          .in('team_org_id', teamIds);

        if (allMembersError) throw allMembersError;
        setTeamMembers(allTeamMembers || []);

        // Fetch team organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('team_organizations')
          .select('id, name')
          .in('id', teamIds);

        if (orgsError) throw orgsError;
        setTeamOrganizations(orgsData || []);

        // Fetch profiles for all teammates
        const teammateIds = [...new Set((allTeamMembers || []).map(m => m.user_id))];
        if (teammateIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', teammateIds);

          if (profilesError) throw profilesError;
          setProfiles(profilesData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  // Get owner info for a customer
  const getCustomerOwnerInfo = (customer: CustomerWithAssignments) => {
    if (!customer.created_by_user_id) return { ownerName: 'Unknown', teamName: null, isOwn: false };
    if (customer.created_by_user_id === user?.id) return { ownerName: 'You', teamName: null, isOwn: true };

    const profile = profiles.find(p => p.id === customer.created_by_user_id);
    const ownerName = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';

    // Find which team this customer creator belongs to (that the current user is also in)
    const ownerTeamMembership = teamMembers.find(
      tm => tm.user_id === customer.created_by_user_id && teamMembers.some(
        myTm => myTm.team_org_id === tm.team_org_id && myTm.user_id === user?.id
      )
    );

    if (ownerTeamMembership) {
      const team = teamOrganizations.find(t => t.id === ownerTeamMembership.team_org_id);
      return { ownerName, teamName: team?.name || null, isOwn: false };
    }

    return { ownerName, teamName: null, isOwn: false };
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.email || !newCustomer.full_name || !newCustomer.password) {
      toast.error('Please fill in all required fields including password');
      return;
    }

    if (newCustomer.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      // Use API to create customer with auth
      const data = await createCustomerWithAuth({
        email: newCustomer.email,
        full_name: newCustomer.full_name,
        company_name: newCustomer.company_name || undefined,
        password: newCustomer.password,
      });

      const successMessage = data?.auth_created
        ? 'Customer created successfully with login credentials'
        : 'Customer created successfully (login credentials may need manual setup)';
      toast.success(successMessage);

      setShowCreateDialog(false);
      setNewCustomer({
        email: '',
        full_name: '',
        company_name: '',
        password: '',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error creating customer:', error);
      const message = error?.response?.data?.detail || error?.message || '';
      if (message.includes('already exists') || message.includes('already been registered')) {
        toast.error('A customer with this email already exists');
      } else {
        toast.error('Failed to create customer');
      }
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This will also remove all their chatbot assignments and login credentials.')) {
      return;
    }

    try {
      await deleteCustomer(customerId);
      // Remove from local state for immediate UI update
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      toast.success('Customer deleted successfully');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      const message = error?.message || '';
      if (message.includes('permission') || message.includes('403')) {
        toast.error('You can only delete customers you created');
      } else {
        toast.error('Failed to delete customer');
      }
    }
  };

  const sendLoginLink = async (customer: Customer) => {
    try {
      await sendCustomerLoginLink(customer.email);
      toast.success('Login link sent successfully');
    } catch (error) {
      console.error('Error sending login link:', error);
      toast.error('Failed to send login link');
    }
  };

  const openChatbotEditor = (customer: CustomerWithAssignments) => {
    setEditingChatbotsCustomer(customer);
    setEditingChatbotIds([...customer.assigned_chatbots]);
  };

  const handleSaveChatbotAssignments = async () => {
    if (!editingChatbotsCustomer) return;

    setSavingChatbots(true);
    try {
      await updateCustomerChatbots(editingChatbotsCustomer.id, editingChatbotIds);
      // Update local state
      setCustomers(prev => prev.map(c =>
        c.id === editingChatbotsCustomer.id
          ? { ...c, assigned_chatbots: editingChatbotIds }
          : c
      ));
      toast.success('Chatbot assignments updated');
      setEditingChatbotsCustomer(null);
    } catch (error: any) {
      console.error('Error updating chatbot assignments:', error);
      toast.error(error?.message || 'Failed to update chatbot assignments');
    } finally {
      setSavingChatbots(false);
    }
  };

  // Filter customers by search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company_name && c.company_name.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Stats
  const withChatbots = customers.filter(c => c.assigned_chatbots.length > 0).length;
  const myCustomers = customers.filter(c => c.created_by_user_id === user?.id).length;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get a stable color from a string
  const getAvatarColor = (str: string) => {
    const colors = [
      'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer accounts, permissions, and chatbot access
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer account with login credentials
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="full_name"
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company</Label>
                  <Input
                    id="company_name"
                    value={newCustomer.company_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={newCustomer.password}
                  onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCustomer}>
                  Create Customer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{customers.length}</p>
              <p className="text-xs text-muted-foreground">Total Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{withChatbots}</p>
              <p className="text-xs text-muted-foreground">With Chatbots Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{myCustomers}</p>
              <p className="text-xs text-muted-foreground">Created by You</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="w-3.5 h-3.5" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="content-reviews" className="gap-2">
            <FileCheck className="w-3.5 h-3.5" />
            Content Reviews
          </TabsTrigger>
          <TabsTrigger value="url-reviews" className="gap-2">
            <Globe className="w-3.5 h-3.5" />
            URL Reviews
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">All Customers</CardTitle>
                  <CardDescription>
                    {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="h-7 w-7 text-muted-foreground" />
                  </div>
                  {customers.length === 0 ? (
                    <>
                      <h3 className="text-sm font-medium mb-1">No customers yet</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                        Add your first customer to manage their access to chatbots and configure portal permissions.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)} className="gap-2">
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Customer
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-medium mb-1">No results found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try a different search term
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6">Customer</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Chatbots</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => {
                        const ownerInfo = getCustomerOwnerInfo(customer);
                        return (
                          <TableRow key={customer.id} className="group">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-full ${getAvatarColor(customer.email)} flex items-center justify-center text-white text-xs font-medium shrink-0`}>
                                  {getInitials(customer.full_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{customer.full_name}</p>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="truncate">{customer.email}</span>
                                    {customer.company_name && (
                                      <>
                                        <span className="shrink-0">·</span>
                                        <span className="truncate flex items-center gap-1">
                                          <Building2 className="w-3 h-3 shrink-0" />
                                          {customer.company_name}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {ownerInfo.isOwn ? (
                                <Badge variant="secondary" className="text-xs font-normal">You</Badge>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-sm">{ownerInfo.ownerName}</span>
                                  {ownerInfo.teamName && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {ownerInfo.teamName}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {customer.assigned_chatbots.length > 0 ? (
                                    customer.assigned_chatbots.map(chatbotId => {
                                      const chatbot = chatbots.find(c => c.id === chatbotId);
                                      return (
                                        <Badge key={chatbotId} variant="outline" className="text-xs font-normal">
                                          {chatbot?.name || 'Unknown'}
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No chatbots</span>
                                  )}
                                </div>
                                {ownerInfo.isOwn && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => openChatbotEditor(customer)}
                                      >
                                        <Settings className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit chatbot assignments</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" />
                                {customer.last_login
                                  ? new Date(customer.last_login).toLocaleDateString()
                                  : 'Never'
                                }
                              </div>
                            </TableCell>
                            <TableCell className="pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setPermissionsCustomer(customer)}
                                    >
                                      <Shield className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Manage permissions</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => sendLoginLink(customer)}
                                    >
                                      <Mail className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Send login link</TooltipContent>
                                </Tooltip>
                                {ownerInfo.isOwn && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteCustomer(customer.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete customer</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Reviews Tab */}
        <TabsContent value="content-reviews">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Content Reviews</CardTitle>
                  <CardDescription>
                    Review and approve customer-submitted FAQs and content changes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PendingContentReview />
            </CardContent>
          </Card>
        </TabsContent>

        {/* URL Reviews Tab */}
        <TabsContent value="url-reviews">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Website Crawl URL Reviews</CardTitle>
                  <CardDescription>
                    Review and approve customer-submitted website URLs for crawling
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PendingCrawlUrlReview />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permissions Dialog */}
      <Dialog open={!!permissionsCustomer} onOpenChange={(open) => !open && setPermissionsCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Customer Permissions
            </DialogTitle>
            <DialogDescription>
              Configure what {permissionsCustomer?.full_name} can access in their portal
            </DialogDescription>
          </DialogHeader>
          {permissionsCustomer && (
            <CustomerPermissionConfig
              customerId={permissionsCustomer.id}
              customerName={permissionsCustomer.full_name}
              onClose={() => setPermissionsCustomer(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Chatbot Assignments Dialog */}
      <Dialog open={!!editingChatbotsCustomer} onOpenChange={(open) => !open && setEditingChatbotsCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Chatbot Assignments</DialogTitle>
            <DialogDescription>
              Select which chatbots {editingChatbotsCustomer?.full_name} can access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {chatbots.map((chatbot) => (
                <div key={chatbot.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`edit-${chatbot.id}`}
                    checked={editingChatbotIds.includes(chatbot.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEditingChatbotIds(prev => [...prev, chatbot.id]);
                      } else {
                        setEditingChatbotIds(prev => prev.filter(id => id !== chatbot.id));
                      }
                    }}
                  />
                  <Label htmlFor={`edit-${chatbot.id}`} className="text-sm cursor-pointer">
                    {chatbot.name}
                  </Label>
                </div>
              ))}
              {chatbots.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No chatbots available</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingChatbotsCustomer(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChatbotAssignments} disabled={savingChatbots}>
                {savingChatbots ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
