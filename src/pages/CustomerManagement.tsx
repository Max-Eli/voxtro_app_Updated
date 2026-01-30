import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Mail, Trash2, Settings, Users, Shield, FileCheck } from 'lucide-react';
import { createCustomerWithAuth, sendCustomerLoginLink } from '@/integrations/api/endpoints';
import { CustomerPermissionConfig } from '@/components/CustomerPermissionConfig';
import { PendingContentReview } from '@/components/PendingContentReview';

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
    assigned_chatbots: [] as string[]
  });
  const [permissionsCustomer, setPermissionsCustomer] = useState<CustomerWithAssignments | null>(null);

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
      // Use API to create customer with auth (pass first chatbot if assigned)
      const data = await createCustomerWithAuth({
        email: newCustomer.email,
        full_name: newCustomer.full_name,
        company_name: newCustomer.company_name || undefined,
        password: newCustomer.password,
        chatbot_id: newCustomer.assigned_chatbots[0] || undefined // Pass first chatbot
      });

      const customerId = data?.customer_id;

      // Create additional chatbot assignments if more than one selected
      if (customerId && newCustomer.assigned_chatbots.length > 0) {
        for (const chatbotId of newCustomer.assigned_chatbots) {
          // Use upsert to handle potential duplicates gracefully
          await supabase
            .from('customer_chatbot_assignments')
            .upsert({
              customer_id: customerId,
              chatbot_id: chatbotId,
              assigned_by: user?.id
            }, {
              onConflict: 'customer_id,chatbot_id',
              ignoreDuplicates: true
            });
        }
      }

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
        assigned_chatbots: []
      });
      fetchData();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This will also remove all their chatbot assignments.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      toast.success('Customer deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pr-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage customer access to your chatbots
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer account and assign chatbots
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newCustomer.full_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newCustomer.password}
                  onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Assign Chatbots (Optional)</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {chatbots.map((chatbot) => (
                    <div key={chatbot.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={chatbot.id}
                        checked={newCustomer.assigned_chatbots.includes(chatbot.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewCustomer({
                              ...newCustomer,
                              assigned_chatbots: [...newCustomer.assigned_chatbots, chatbot.id]
                            });
                          } else {
                            setNewCustomer({
                              ...newCustomer,
                              assigned_chatbots: newCustomer.assigned_chatbots.filter(id => id !== chatbot.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={chatbot.id} className="text-sm">
                        {chatbot.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            Manage customer accounts and their chatbot access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No customers found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first customer to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Assigned Chatbots</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const ownerInfo = getCustomerOwnerInfo(customer);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.full_name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.company_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ownerInfo.isOwn ? (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{ownerInfo.ownerName}</span>
                              {ownerInfo.teamName && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {ownerInfo.teamName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.assigned_chatbots.map(chatbotId => {
                            const chatbot = chatbots.find(c => c.id === chatbotId);
                            return (
                              <Badge key={chatbotId} variant="secondary" className="text-xs">
                                {chatbot?.name || 'Unknown'}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.last_login
                          ? new Date(customer.last_login).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPermissionsCustomer(customer)}
                            title="Manage Permissions"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendLoginLink(customer)}
                            title="Send Login Link"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          {ownerInfo.isOwn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Content Reviews */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle>Customer Content Reviews</CardTitle>
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
    </div>
  );
}