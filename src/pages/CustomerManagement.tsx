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
import { UserPlus, Mail, Trash2, Settings } from 'lucide-react';
import { createCustomerWithAuth, sendCustomerLoginLink } from '@/integrations/api/endpoints';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  weekly_summary_enabled: boolean;
  last_login?: string;
  created_at: string;
}

interface Chatbot {
  id: string;
  name: string;
  description?: string;
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
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    full_name: '',
    company_name: '',
    password: '',
    assigned_chatbots: [] as string[]
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch user's chatbots
      const { data: chatbotsData, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id, name, description')
        .eq('user_id', user?.id);

      if (chatbotsError) throw chatbotsError;
      setChatbots(chatbotsData || []);

      // Fetch customers created by this user
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          customer_chatbot_assignments (
            chatbot_id
          )
        `)
        .eq('created_by_user_id', user?.id);

      if (customersError) throw customersError;

      // Map customers with their assigned chatbot IDs
      const userChatbotIds = chatbotsData?.map(c => c.id) || [];
      const customersWithAssignments = customersData?.map(customer => ({
        ...customer,
        assigned_chatbots: customer.customer_chatbot_assignments
          .filter(assignment => userChatbotIds.includes(assignment.chatbot_id))
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

  const handleCreateCustomer = async () => {
    if (!newCustomer.email || !newCustomer.full_name || !newCustomer.password) {
      toast.error('Please fill in all required fields including password');
      return;
    }

    if (newCustomer.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newCustomer.assigned_chatbots.length === 0) {
      toast.error('Please assign at least one chatbot to the customer');
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
          await supabase
            .from('customer_chatbot_assignments')
            .insert({
              customer_id: customerId,
              chatbot_id: chatbotId,
              assigned_by: user?.id
            })
            .onConflict('customer_id,chatbot_id')
            .ignore();
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
      await sendCustomerLoginLink({
        email: customer.email,
        full_name: customer.full_name
      });

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
                <Label>Assign Chatbots *</Label>
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
                  <TableHead>Assigned Chatbots</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
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
                          onClick={() => sendLoginLink(customer)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}