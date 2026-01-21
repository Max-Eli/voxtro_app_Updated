import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Webhook, Settings, Plus, Trash2 } from 'lucide-react';


interface ActionConfigurationFormProps {
  chatbotId: string;
  onSuccess: () => void;
  action?: ChatbotAction; // Optional action for editing
}

interface ChatbotAction {
  id: string;
  action_type: string;
  name: string;
  description: string;
  configuration: any;
  is_active: boolean;
  created_at: string;
}

const ACTION_TYPES = [
  {
    id: 'email_send',
    name: 'Send Email',
    description: 'Send emails to users or notify team members',
    icon: Mail,
  },
  {
    id: 'webhook_call',
    name: 'Webhook Call',
    description: 'Call external APIs or services',
    icon: Webhook,
  },
  {
    id: 'custom_tool',
    name: 'Custom Tool',
    description: 'Create a custom tool with configurable parameters for automation',
    icon: Settings,
  },
];

export function ActionConfigurationForm({ chatbotId, onSuccess, action }: ActionConfigurationFormProps) {
  const [selectedType, setSelectedType] = useState<string>(action?.action_type || '');
  const [name, setName] = useState(action?.name || '');
  const [description, setDescription] = useState(action?.description || '');
  const [configuration, setConfiguration] = useState<any>(action?.configuration || {});
  const [isLoading, setIsLoading] = useState(false);
  const [customParameters, setCustomParameters] = useState<Array<{name: string, type: string, description: string, required: boolean}>>(
    action?.action_type === 'custom_tool' && action?.configuration?.parameters ? action.configuration.parameters : []
  );
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !name.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalConfiguration = selectedType === 'custom_tool' 
        ? { ...configuration, parameters: customParameters }
        : configuration;

      if (action) {
        // Update existing action
        const { error } = await supabase
          .from('chatbot_actions')
          .update({
            action_type: selectedType,
            name: name.trim(),
            description: description.trim(),
            configuration: finalConfiguration,
          })
          .eq('id', action.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Action updated successfully',
        });
      } else {
        // Create new action
        const { error } = await supabase
          .from('chatbot_actions')
          .insert({
            chatbot_id: chatbotId,
            action_type: selectedType,
            name: name.trim(),
            description: description.trim(),
            configuration: finalConfiguration,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Action created successfully',
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error creating action:', error);
      toast({
        title: 'Error',
        description: 'Failed to create action',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfiguration = (key: string, value: any) => {
    setConfiguration(prev => ({ ...prev, [key]: value }));
  };

  const addCustomParameter = () => {
    setCustomParameters(prev => [...prev, { name: '', type: 'text', description: '', required: false }]);
  };

  const removeCustomParameter = (index: number) => {
    setCustomParameters(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomParameter = (index: number, field: string, value: any) => {
    setCustomParameters(prev => prev.map((param, i) => 
      i === index ? { ...param, [field]: value } : param
    ));
  };

  const renderConfigurationFields = () => {
    switch (selectedType) {
      case 'email_send':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-provider">Email Provider</Label>
              <Select 
                value={configuration.provider || ''} 
                onValueChange={(value) => updateConfiguration('provider', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select email provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email-from">From Email</Label>
              <Input
                id="email-from"
                type="email"
                placeholder="noreply@yourcompany.com"
                value={configuration.fromEmail || ''}
                onChange={(e) => updateConfiguration('fromEmail', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email-to">Default To Email</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="support@yourcompany.com"
                value={configuration.defaultToEmail || ''}
                onChange={(e) => updateConfiguration('defaultToEmail', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email-template">Email Template</Label>
              <Textarea
                id="email-template"
                placeholder="Enter email template..."
                value={configuration.emailTemplate || ''}
                onChange={(e) => updateConfiguration('emailTemplate', e.target.value)}
              />
            </div>
          </div>
        );

      case 'webhook_call':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://api.yourservice.com/webhook"
                value={configuration.webhookUrl || ''}
                onChange={(e) => updateConfiguration('webhookUrl', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="webhook-method">HTTP Method</Label>
              <Select 
                value={configuration.method || 'POST'} 
                onValueChange={(value) => updateConfiguration('method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select HTTP method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="webhook-headers">Headers (JSON)</Label>
              <Textarea
                id="webhook-headers"
                placeholder='{"Authorization": "Bearer YOUR_TOKEN"}'
                value={configuration.headers || ''}
                onChange={(e) => updateConfiguration('headers', e.target.value)}
              />
            </div>
          </div>
        );

      case 'custom_tool':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hook.make.com/your-webhook-id"
                value={configuration.webhookUrl || ''}
                onChange={(e) => updateConfiguration('webhookUrl', e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Connect to Make.com, Zapier, or any webhook endpoint
              </p>
            </div>
            
            <div>
              <Label htmlFor="tool-trigger">Tool Trigger Phrase</Label>
              <Input
                id="tool-trigger"
                placeholder="e.g., 'book appointment', 'send notification'"
                value={configuration.triggerPhrase || ''}
                onChange={(e) => updateConfiguration('triggerPhrase', e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                When users say this phrase, the tool will be triggered
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Custom Parameters</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomParameter}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Parameter
                </Button>
              </div>
              
              {customParameters.map((param, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`param-name-${index}`}>Parameter Name</Label>
                      <Input
                        id={`param-name-${index}`}
                        placeholder="e.g., customer_email"
                        value={param.name}
                        onChange={(e) => updateCustomParameter(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`param-type-${index}`}>Parameter Type</Label>
                      <Select 
                        value={param.type} 
                        onValueChange={(value) => updateCustomParameter(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`param-desc-${index}`}>Description</Label>
                      <Input
                        id={`param-desc-${index}`}
                        placeholder="Describe what this parameter is for"
                        value={param.description}
                        onChange={(e) => updateCustomParameter(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateCustomParameter(index, 'required', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Required parameter</span>
                      </label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeCustomParameter(index)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {customParameters.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-muted-foreground">No parameters added yet</p>
                  <p className="text-sm text-muted-foreground">Add parameters that your automation tool needs</p>
                </div>
              )}
            </div>

            {/* Email Automation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  📩 Email Automation
                </CardTitle>
                <CardDescription>
                  Automatically send emails when this tool is triggered and all required parameters are collected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="email-automation-enabled"
                    checked={configuration.emailAutomation?.enabled || false}
                    onChange={(e) => updateConfiguration('emailAutomation', {
                      ...configuration.emailAutomation,
                      enabled: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="email-automation-enabled">Enable email trigger for this tool</Label>
                </div>

                {configuration.emailAutomation?.enabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-muted">
                    <div>
                      <Label htmlFor="email-subject">Email Subject</Label>
                      <Input
                        id="email-subject"
                        placeholder="e.g., New Lead from {{bot_name}}"
                        value={configuration.emailAutomation?.subject || ''}
                        onChange={(e) => updateConfiguration('emailAutomation', {
                          ...configuration.emailAutomation,
                          subject: e.target.value
                        })}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Use {`{{bot_name}}`} for chatbot name and parameter names like {`{{name}}, {{email}}`}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="email-body">Email Body Template</Label>
                      <Textarea
                        id="email-body"
                        placeholder="Name: {{name}}&#10;Email: {{email}}&#10;Service: {{service}}&#10;Notes: {{notes}}"
                        value={configuration.emailAutomation?.body || ''}
                        onChange={(e) => updateConfiguration('emailAutomation', {
                          ...configuration.emailAutomation,
                          body: e.target.value
                        })}
                        rows={6}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Use dynamic variables from your tool parameters (e.g., {`{{name}}, {{email}}, {{service}}`})
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="email-recipients">Recipient Email(s)</Label>
                      <Input
                        id="email-recipients"
                        placeholder="admin@company.com, {{email}}"
                        value={configuration.emailAutomation?.recipients || ''}
                        onChange={(e) => updateConfiguration('emailAutomation', {
                          ...configuration.emailAutomation,
                          recipients: e.target.value
                        })}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Comma-separated emails. Use {`{{email}}`} or other parameters as recipients
                      </p>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">✨ Example Configuration:</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Subject:</strong> New Lead from {`{{bot_name}}`}</p>
                        <p><strong>Body:</strong></p>
                        <pre className="bg-background p-2 rounded text-xs whitespace-pre-wrap">
Name: {`{{name}}`}{'\n'}Email: {`{{email}}`}{'\n'}Service: {`{{service}}`}{'\n'}Notes: {`{{notes}}`}
                        </pre>
                        <p><strong>Recipients:</strong> support@company.com, {`{{email}}`}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="action-type">Action Type</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select action type" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedType && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {ACTION_TYPES.find(t => t.id === selectedType)?.name}
              </CardTitle>
              <CardDescription>
                {ACTION_TYPES.find(t => t.id === selectedType)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="action-name">Action Name</Label>
                  <Input
                    id="action-name"
                    placeholder="e.g., Book Appointment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="action-description">Description</Label>
                  <Textarea
                    id="action-description"
                    placeholder="Describe what this action does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {renderConfigurationFields()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading || !selectedType || !name.trim()}>
          {isLoading ? (action ? 'Updating...' : 'Creating...') : (action ? 'Update Action' : 'Create Action')}
        </Button>
      </div>
    </form>
  );
}