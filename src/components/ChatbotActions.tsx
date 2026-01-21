import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Plus, Trash2, Power, PowerOff, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActionConfigurationForm } from './ActionConfigurationForm';

interface ChatbotAction {
  id: string;
  action_type: string;
  name: string;
  description: string;
  configuration: any;
  is_active: boolean;
  created_at: string;
}

interface ChatbotActionsProps {
  chatbotId: string;
}

export function ChatbotActions({ chatbotId }: ChatbotActionsProps) {
  const [actions, setActions] = useState<ChatbotAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAction, setEditingAction] = useState<ChatbotAction | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchActions();
  }, [chatbotId]);

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_actions')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch actions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAction = async (actionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbot_actions')
        .update({ is_active: !isActive })
        .eq('id', actionId);

      if (error) throw error;
      
      await fetchActions();
      toast({
        title: 'Success',
        description: `Action ${!isActive ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling action:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle action',
        variant: 'destructive',
      });
    }
  };

  const deleteAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_actions')
        .delete()
        .eq('id', actionId);

      if (error) throw error;
      
      await fetchActions();
      toast({
        title: 'Success',
        description: 'Action deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting action:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete action',
        variant: 'destructive',
      });
    }
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'calendar_booking':
        return 'Calendar Booking';
      case 'email_send':
        return 'Send Email';
      case 'webhook_call':
        return 'Webhook Call';
      case 'zapier_trigger':
        return 'Zapier Trigger';
      case 'custom_tool':
        return 'Custom Tool';
      default:
        return type;
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'calendar_booking':
        return 'bg-blue-100 text-blue-800';
      case 'email_send':
        return 'bg-green-100 text-green-800';
      case 'webhook_call':
        return 'bg-purple-100 text-purple-800';
      case 'zapier_trigger':
        return 'bg-orange-100 text-orange-800';
      case 'custom_tool':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Actions & Functions
          </CardTitle>
          <CardDescription>Loading actions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Actions & Functions
        </CardTitle>
        <CardDescription>
          Configure actions your chatbot can perform, like booking appointments or sending emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {actions.length} action{actions.length !== 1 ? 's' : ''} configured
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" type="button">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-4xl w-full max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Action</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 p-1">
                <ActionConfigurationForm 
                  chatbotId={chatbotId} 
                  onSuccess={() => {
                    setShowAddDialog(false);
                    fetchActions();
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Action Dialog */}
        <Dialog open={!!editingAction} onOpenChange={() => setEditingAction(null)}>
          <DialogContent className="!max-w-4xl w-full max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Action</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 p-1">
              {editingAction && (
                <ActionConfigurationForm 
                  chatbotId={chatbotId}
                  action={editingAction}
                  onSuccess={() => {
                    setEditingAction(null);
                    fetchActions();
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No actions configured</h3>
            <p className="text-sm mb-4">
              Add actions to let your chatbot perform tasks like booking appointments or sending emails
            </p>
            <Button onClick={() => setShowAddDialog(true)} type="button">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Action
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{action.name}</h4>
                    <Badge className={getActionTypeColor(action.action_type)}>
                      {getActionTypeLabel(action.action_type)}
                    </Badge>
                    <Badge variant={action.is_active ? "default" : "secondary"}>
                      {action.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {action.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {action.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(action.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setEditingAction(action)}
                    title="Edit action"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => toggleAction(action.id, action.is_active)}
                  >
                    {action.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => deleteAction(action.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}