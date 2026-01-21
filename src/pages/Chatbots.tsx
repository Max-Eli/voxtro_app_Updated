import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatbotAnalytics } from '@/components/ChatbotAnalytics';
import ConversationsList from '@/components/ConversationsList';
import ConversationDetail from '@/components/ConversationDetail';
import { ChatbotEditor } from '@/components/ChatbotEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Plus, 
  MessageCircle, 
  Globe, 
  Copy,
  Trash2,
  BarChart3,
  Eye,
  Files,
  Power,
  ExternalLink,
  Loader2,
  ChevronRight,
  Search,
  Settings2,
  Users2,
  Pencil
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface Chatbot {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  theme_color: string;
  website_url: string;
  website_content?: string;
  crawl_status?: string;
  last_crawled_at?: string;
  created_at: string;
  conversationCount?: number;
}

interface Customer {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
}

interface AssignmentWithCustomer {
  id: string;
  chatbot_id: string;
  customer: Customer;
}

export default function Chatbots() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('conversations');

  const fetchChatbots = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch conversation counts for each chatbot
      const chatbotsWithCounts = await Promise.all(
        (data || []).map(async (chatbot) => {
          const { count } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('chatbot_id', chatbot.id);
          
          return {
            ...chatbot,
            conversationCount: count || 0
          };
        })
      );

      setChatbots(chatbotsWithCounts);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load chatbots',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    if (!user?.id) return;

    try {
      const { data: chatbotsData } = await supabase
        .from('chatbots')
        .select('id')
        .eq('user_id', user.id);

      const chatbotIds = chatbotsData?.map(c => c.id) || [];

      if (chatbotIds.length > 0) {
        const { data: customersData, error } = await supabase
          .from('customers')
          .select(`
            *,
            customer_chatbot_assignments!inner (
              chatbot_id
            )
          `)
          .in('customer_chatbot_assignments.chatbot_id', chatbotIds);

        if (error) throw error;
        
        const uniqueCustomers = Array.from(
          new Map(customersData?.map(c => [c.id, c])).values()
        ) as Customer[];
        
        setCustomers(uniqueCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAssignments = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('customer_chatbot_assignments')
        .select(`
          id,
          chatbot_id,
          customers (
            id,
            email,
            full_name,
            company_name
          )
        `)
        .eq('assigned_by', user.id);

      if (error) throw error;
      
      const formattedAssignments = data?.map(a => ({
        id: a.id,
        chatbot_id: a.chatbot_id,
        customer: a.customers as unknown as Customer
      })) || [];
      
      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  useEffect(() => {
    if (user?.id && !authLoading) {
      fetchChatbots();
      fetchCustomers();
      fetchAssignments();
    }
  }, [user?.id, authLoading]);

  // Auto-select first chatbot when data loads
  useEffect(() => {
    if (chatbots.length > 0 && !selectedChatbotId) {
      setSelectedChatbotId(chatbots[0].id);
    }
  }, [chatbots, selectedChatbotId]);

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (only after auth loading is complete)
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCreateChatbot = () => {
    navigate('/create-chatbot');
  };

  const handleDeleteChatbot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chatbots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setChatbots(chatbots.filter(bot => bot.id !== id));
      if (selectedChatbotId === id) {
        setSelectedChatbotId(chatbots.filter(bot => bot.id !== id)[0]?.id || null);
      }
      toast({
        title: 'Success',
        description: 'Chatbot deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete chatbot',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateChatbot = async (id: string) => {
    try {
      // Fetch the full chatbot data
      const { data: originalChatbot, error: fetchError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create a duplicate with modified fields
      const duplicateData = {
        ...originalChatbot,
        id: undefined,
        name: `Copy of ${originalChatbot.name}`,
        is_active: true,
        created_at: undefined,
        updated_at: undefined,
        last_crawled_at: undefined,
        crawl_status: 'pending',
        embed_code: undefined,
        inline_embed_code: undefined,
        user_id: user?.id
      };

      const { data: newChatbot, error: createError } = await supabase
        .from('chatbots')
        .insert(duplicateData)
        .select()
        .single();

      if (createError) throw createError;

      const newChatbotId = newChatbot.id;

      // Copy chatbot actions
      const { data: originalActions } = await supabase
        .from('chatbot_actions')
        .select('*')
        .eq('chatbot_id', id);

      if (originalActions && originalActions.length > 0) {
        const actionsToInsert = originalActions.map(action => ({
          ...action,
          id: undefined,
          chatbot_id: newChatbotId,
          created_at: undefined,
          updated_at: undefined
        }));

        await supabase
          .from('chatbot_actions')
          .insert(actionsToInsert);
      }

      // Copy FAQs
      const { data: originalFaqs } = await supabase
        .from('chatbot_faqs')
        .select('*')
        .eq('chatbot_id', id);

      if (originalFaqs && originalFaqs.length > 0) {
        const faqsToInsert = originalFaqs.map(faq => ({
          ...faq,
          id: undefined,
          chatbot_id: newChatbotId,
          created_at: undefined,
          updated_at: undefined
        }));

        await supabase
          .from('chatbot_faqs')
          .insert(faqsToInsert);
      }

      // Copy custom parameters
      const { data: originalParams } = await supabase
        .from('chatbot_custom_parameters')
        .select('*')
        .eq('chatbot_id', id);

      if (originalParams && originalParams.length > 0) {
        const paramsToInsert = originalParams.map(param => ({
          ...param,
          id: undefined,
          chatbot_id: newChatbotId,
          created_at: undefined,
          updated_at: undefined
        }));

        await supabase
          .from('chatbot_custom_parameters')
          .insert(paramsToInsert);
      }

      fetchChatbots();
      
      toast({
        title: 'Success',
        description: 'Chatbot duplicated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate chatbot',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbots')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchChatbots();
      
      toast({
        title: 'Success',
        description: `Chatbot ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update chatbot status',
        variant: 'destructive',
      });
    }
  };

  const handleAssignChatbot = async () => {
    if (!selectedChatbotId || !selectedCustomer) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_chatbot_assignments')
        .insert({
          customer_id: selectedCustomer,
          chatbot_id: selectedChatbotId,
          assigned_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'This customer is already assigned to this chatbot',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Success',
        description: 'Chatbot assigned successfully',
      });
      setShowAssignDialog(false);
      setSelectedCustomer('');
      await fetchAssignments();
    } catch (error) {
      console.error('Error assigning chatbot:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign chatbot',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('customer_chatbot_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment removed',
      });
      await fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove assignment',
        variant: 'destructive',
      });
    }
  };

  const copyEmbedCode = (botId: string, type: 'widget' | 'inline' | 'messenger' = 'widget') => {
    let embedCode;
    let description;
    
    if (type === 'inline') {
      embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/inline-chat/${botId}.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
      description = 'Inline chat embed code copied to clipboard';
    } else if (type === 'messenger') {
      embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/messenger/${botId}.js';
    script.async = true;
    script.onload = function() {
      window.openVoxtroMessenger();
    };
    document.head.appendChild(script);
  })();
</script>`;
      description = 'Full-screen messenger embed code copied to clipboard';
    } else {
      embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://atmwldssfrbmcluvmelm.functions.supabase.co/functions/v1/widget/${botId}.js?v=' + Date.now();
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
      description = 'Widget embed code copied to clipboard';
    }
    
    navigator.clipboard.writeText(embedCode);
    toast({
      title: 'Copied!',
      description: description,
    });
  };

  const getCrawlStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      completed: { variant: "default", label: "Crawled" },
      crawling: { variant: "secondary", label: "Crawling..." },
      failed: { variant: "destructive", label: "Failed" },
      pending: { variant: "outline", label: "Pending" }
    };
    
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const selectedChatbot = chatbots.find(c => c.id === selectedChatbotId);
  const selectedAssignments = assignments.filter(a => a.chatbot_id === selectedChatbotId);
  const filteredChatbots = chatbots.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Chatbot List */}
      <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Chatbots</h1>
            </div>
            <Button onClick={handleCreateChatbot} size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search chatbots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Chatbot List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredChatbots.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No matching chatbots' : 'No chatbots yet'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreateChatbot} variant="link" className="text-xs mt-1 p-0 h-auto">
                    Create your first chatbot
                  </Button>
                )}
              </div>
            ) : (
              filteredChatbots.map((chatbot) => {
                const assignmentCount = assignments.filter(a => a.chatbot_id === chatbot.id).length;
                const isSelected = selectedChatbotId === chatbot.id;
                
                return (
                  <button
                    key={chatbot.id}
                    onClick={() => setSelectedChatbotId(chatbot.id)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: chatbot.is_active ? '#22c55e' : '#94a3b8' }}
                          />
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                            {chatbot.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 ml-4">
                          <span className="text-xs text-muted-foreground">
                            {chatbot.conversationCount || 0} chats
                          </span>
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
              })
            )}
          </div>
        </ScrollArea>

        {/* Sidebar Footer Stats */}
        {chatbots.length > 0 && (
          <div className="p-3 border-t border-border bg-background/50">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{chatbots.length} chatbots</span>
              <span>{chatbots.filter(c => c.is_active).length} active</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Chatbot Details */}
      <div className="flex-1 overflow-auto">
        {selectedChatbot ? (
          <div className="p-6 max-w-4xl">
            {/* Chatbot Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div 
                  className="p-3 rounded-xl border"
                  style={{ 
                    backgroundColor: `${selectedChatbot.theme_color}15`,
                    borderColor: `${selectedChatbot.theme_color}30`
                  }}
                >
                  <Bot className="h-6 w-6" style={{ color: selectedChatbot.theme_color }} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{selectedChatbot.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedChatbot.is_active ? "default" : "secondary"}>
                      {selectedChatbot.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created {new Date(selectedChatbot.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                  className="gap-1.5"
                >
                  <Users2 className="h-4 w-4" />
                  Assign
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setActiveTab('edit')}
                  className="gap-1.5"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Description */}
            {selectedChatbot.description && (
              <Card className="mb-6">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{selectedChatbot.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Button variant="outline" size="sm" onClick={() => navigate(`/embed/${selectedChatbot.id}`)} className="justify-start gap-2">
                <Eye className="h-4 w-4" />
                Preview Widget
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/messenger/${selectedChatbot.id}`)} className="justify-start gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview Messenger
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyEmbedCode(selectedChatbot.id, 'widget')} className="justify-start gap-2">
                <Copy className="h-4 w-4" />
                Copy Widget Code
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyEmbedCode(selectedChatbot.id, 'messenger')} className="justify-start gap-2">
                <Copy className="h-4 w-4" />
                Copy Messenger Code
              </Button>
            </div>

            {/* Configuration & Website */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Configuration</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Website</p>
                        {selectedChatbot.website_url ? (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {new URL(selectedChatbot.website_url).hostname}
                            </p>
                            {getCrawlStatusBadge(selectedChatbot.crawl_status)}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not configured</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Conversations</p>
                        <p className="text-sm font-medium">{selectedChatbot.conversationCount || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs for Edit, Conversations, Analytics, Customers */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="conversations">
                  Conversations ({selectedChatbot.conversationCount || 0})
                </TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="customers">
                  Customers ({selectedAssignments.length})
                </TabsTrigger>
                <TabsTrigger value="edit">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="conversations" className="space-y-4">
                <Card className="h-[400px] overflow-hidden">
                  <CardContent className="p-0 h-full">
                    {selectedConversationId ? (
                      <ConversationDetail 
                        conversationId={selectedConversationId} 
                        onBack={() => setSelectedConversationId(null)}
                      />
                    ) : (
                      <ConversationsList 
                        onConversationSelect={setSelectedConversationId}
                        chatbotId={selectedChatbot.id}
                        hideFilter={true}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <ChatbotAnalytics chatbotId={selectedChatbot.id} />
              </TabsContent>

              <TabsContent value="customers" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Assigned Customers</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => setShowAssignDialog(true)} className="gap-1.5">
                        <Users2 className="h-4 w-4" />
                        Assign Customer
                      </Button>
                    </div>
                    <CardDescription>
                      Customers who have access to this chatbot
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedAssignments.length === 0 ? (
                      <div className="text-center py-6">
                        <Users2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No customers assigned</p>
                        <Button 
                          variant="link" 
                          className="text-xs mt-1 p-0 h-auto"
                          onClick={() => setShowAssignDialog(true)}
                        >
                          Assign your first customer
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedAssignments.map((assignment) => (
                          <div 
                            key={assignment.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">{assignment.customer.full_name}</p>
                              <p className="text-xs text-muted-foreground">{assignment.customer.email}</p>
                              {assignment.customer.company_name && (
                                <p className="text-xs text-muted-foreground">{assignment.customer.company_name}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(assignment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                <ChatbotEditor 
                  chatbotId={selectedChatbot.id} 
                  onSave={() => {
                    fetchChatbots();
                    setActiveTab('conversations');
                  }}
                />
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Chatbot Actions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => handleDuplicateChatbot(selectedChatbot.id)} className="justify-start gap-2">
                        <Files className="h-4 w-4" />
                        Duplicate Chatbot
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleToggleActive(selectedChatbot.id, selectedChatbot.is_active)}
                        className="justify-start gap-2"
                      >
                        <Power className="h-4 w-4" />
                        {selectedChatbot.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start gap-2 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteChatbot(selectedChatbot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Chatbot
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No chatbot selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a chatbot from the sidebar or create a new one
              </p>
              <Button onClick={handleCreateChatbot}>
                <Plus className="h-4 w-4 mr-2" />
                Create Chatbot
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Customer Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Chatbot to Customer</DialogTitle>
            <DialogDescription>
              Select a customer to give them access to this chatbot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No customers available
                  </div>
                ) : (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col">
                        <span>{customer.full_name}</span>
                        <span className="text-xs text-muted-foreground">{customer.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignChatbot} disabled={!selectedCustomer}>
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
