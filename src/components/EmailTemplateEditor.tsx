import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Plus, Trash2, TestTube, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailConditionRule {
  type: 'message_content' | 'custom_parameter' | 'basic' | 'parameter_exists';
  field: string;
  operator: string;
  value: string;
  case_sensitive?: boolean; // For message content only
  sender?: 'user' | 'bot' | 'any'; // For message content only
  parameter_name?: string; // For parameter existence checks
}

interface EmailConditionGroup {
  logic: 'AND' | 'OR';
  rules: EmailConditionRule[];
}

interface EmailConditions {
  logic: 'AND' | 'OR';
  groups: EmailConditionGroup[];
}

interface EmailTemplateEditorProps {
  chatbotId: string;
  template: string;
  conditions: EmailConditions;
  notificationEmail: string;
  onTemplateChange: (template: string) => void;
  onConditionsChange: (conditions: EmailConditions) => void;
}

interface CustomParameter {
  id: string;
  parameter_name: string;
  parameter_type: string;
  is_required: boolean;
}

interface ToolParameter {
  tool_name: string;
  parameter_name: string;
  parameter_type: string;
  is_required: boolean;
}

const RULE_TYPES = [
  { value: 'basic', label: 'Basic Condition' },
  { value: 'message_content', label: 'Message Content' },
  { value: 'custom_parameter', label: 'Custom Parameter' },
  { value: 'parameter_exists', label: 'Parameter Exists' }
];

const BASIC_FIELD_OPTIONS = [
  { value: 'always', label: 'Always send email' }
];

const MESSAGE_CONTENT_FIELDS = [
  { value: 'user_message', label: 'User Messages' },
  { value: 'bot_message', label: 'Bot Messages' },
  { value: 'any_message', label: 'Any Messages' }
];

const CUSTOM_PARAMETER_FIELDS = [
  { value: 'conversation_length', label: 'Conversation Length (messages)' },
  { value: 'conversation_duration', label: 'Duration (minutes)' },
  { value: 'user_rating', label: 'User Rating' },
  { value: 'summary_sentiment', label: 'Summary Sentiment' },
  { value: 'agent_name', label: 'Agent/Bot Name' }
];

const SENDER_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'bot', label: 'Bot' },
  { value: 'any', label: 'Any' }
];

const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'not_equals', label: 'Does Not Equal' }
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_equal', label: 'Greater Than or Equal' },
  { value: 'less_than_equal', label: 'Less Than or Equal' },
  { value: 'not_equals', label: 'Not Equal' }
];

const TEMPLATE_VARIABLES = [
  '{{user_name}}',
  '{{bot_name}}',
  '{{conversation_summary}}',
  '{{timestamp}}',
  '{{first_message}}',
  '{{last_message}}'
];

export function EmailTemplateEditor({
  chatbotId,
  template,
  conditions,
  notificationEmail,
  onTemplateChange,
  onConditionsChange
}: EmailTemplateEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [customParameters, setCustomParameters] = useState<CustomParameter[]>([]);
  const [toolParameters, setToolParameters] = useState<ToolParameter[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomParameters();
    loadToolParameters();
  }, [chatbotId]);

  const loadCustomParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_custom_parameters')
        .select('id, parameter_name, parameter_type, is_required')
        .eq('chatbot_id', chatbotId);

      if (error) throw error;
      setCustomParameters(data || []);
    } catch (error) {
      console.error('Error loading custom parameters:', error);
    }
  };

  const loadToolParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_actions')
        .select('name, configuration')
        .eq('chatbot_id', chatbotId)
        .eq('action_type', 'custom_tool')
        .eq('is_active', true);

      if (error) throw error;

      const toolParams: ToolParameter[] = [];
      data?.forEach(action => {
        const config = action.configuration as any;
        const parameters = config?.parameters || [];
        parameters.forEach((param: any) => {
          toolParams.push({
            tool_name: action.name,
            parameter_name: param.name,
            parameter_type: param.type,
            is_required: param.required
          });
        });
      });

      setToolParameters(toolParams);
    } catch (error) {
      console.error('Error loading tool parameters:', error);
    }
  };

  // Convert legacy conditions to new format if needed
  const normalizedConditions = conditions.groups 
    ? conditions 
    : {
        logic: conditions.logic || 'AND',
        groups: [{
          logic: 'AND' as const,
          rules: (conditions as any).rules || [{ type: 'basic', field: 'always', operator: 'equals', value: 'true' }]
        }]
      };

  const addGroup = () => {
    const newConditions = {
      ...normalizedConditions,
      groups: [
        ...normalizedConditions.groups,
        {
          logic: 'AND' as const,
          rules: [{ type: 'basic' as const, field: 'always', operator: 'equals', value: 'true' }]
        }
      ]
    };
    onConditionsChange(newConditions);
  };

  const addConditionToGroup = (groupIndex: number) => {
    const newConditions = {
      ...normalizedConditions,
      groups: normalizedConditions.groups.map((group, i) => 
        i === groupIndex 
          ? {
              ...group,
              rules: [...group.rules, { type: 'basic' as const, field: 'always', operator: 'equals', value: 'true' }]
            }
          : group
      )
    };
    onConditionsChange(newConditions);
  };

  const removeGroup = (groupIndex: number) => {
    if (normalizedConditions.groups.length === 1) return; // Keep at least one group
    
    const newConditions = {
      ...normalizedConditions,
      groups: normalizedConditions.groups.filter((_, i) => i !== groupIndex)
    };
    onConditionsChange(newConditions);
  };

  const removeCondition = (groupIndex: number, ruleIndex: number) => {
    const group = normalizedConditions.groups[groupIndex];
    if (group.rules.length === 1) return; // Keep at least one rule per group
    
    const newConditions = {
      ...normalizedConditions,
      groups: normalizedConditions.groups.map((group, i) => 
        i === groupIndex 
          ? {
              ...group,
              rules: group.rules.filter((_, j) => j !== ruleIndex)
            }
          : group
      )
    };
    onConditionsChange(newConditions);
  };

  const updateCondition = (groupIndex: number, ruleIndex: number, field: keyof EmailConditionRule, value: string | boolean) => {
    const newConditions = {
      ...normalizedConditions,
      groups: normalizedConditions.groups.map((group, i) => 
        i === groupIndex 
          ? {
              ...group,
              rules: group.rules.map((rule, j) => 
                j === ruleIndex ? { ...rule, [field]: value } : rule
              )
            }
          : group
      )
    };
    onConditionsChange(newConditions);
  };

  const updateGroupLogic = (groupIndex: number, logic: 'AND' | 'OR') => {
    const newConditions = {
      ...normalizedConditions,
      groups: normalizedConditions.groups.map((group, i) => 
        i === groupIndex ? { ...group, logic } : group
      )
    };
    onConditionsChange(newConditions);
  };

  const updateMainLogic = (logic: 'AND' | 'OR') => {
    onConditionsChange({ ...normalizedConditions, logic });
  };

  const getAvailableOperators = (rule: EmailConditionRule) => {
    if (rule.type === 'custom_parameter') {
      const field = CUSTOM_PARAMETER_FIELDS.find(f => f.value === rule.field);
      if (field?.value === 'conversation_length' || field?.value === 'conversation_duration' || field?.value === 'user_rating') {
        return NUMBER_OPERATORS;
      }
      // Check if it's a custom parameter that should use numeric operators
      const customParam = customParameters.find(p => p.parameter_name === rule.field);
      if (customParam?.parameter_type === 'number') {
        return NUMBER_OPERATORS;
      }
    }
    return TEXT_OPERATORS;
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('email-template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newTemplate = template.slice(0, start) + variable + template.slice(end);
      onTemplateChange(newTemplate);
      
      // Reset cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const generatePreview = () => {
    const mockData = {
      user_name: 'John Doe',
      bot_name: 'SalesBot',
      conversation_summary: 'The user inquired about pricing for the premium package and asked about scheduling a demo. The conversation covered features, pricing tiers, and implementation timeline.',
      timestamp: new Date().toLocaleString(),
      first_message: 'Hi, I\'m interested in learning more about your premium package.',
      last_message: 'Thank you for the information. I\'ll discuss this with my team and get back to you soon.'
    };

    let preview = template;
    Object.entries(mockData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      preview = preview.replace(regex, value);
    });

    // Add custom parameter placeholders
    customParameters.forEach(param => {
      const regex = new RegExp(`\\{\\{${param.parameter_name}\\}\\}`, 'g');
      preview = preview.replace(regex, `[Mock ${param.parameter_name}]`);
    });

    // Add tool parameter placeholders
    toolParameters.forEach(param => {
      const regex = new RegExp(`\\{\\{tool_${param.parameter_name}\\}\\}`, 'g');
      preview = preview.replace(regex, `[Mock Tool Data: ${param.parameter_name}]`);
    });

    return preview;
  };

  const sendTestEmail = async () => {
    if (!notificationEmail) {
      toast({
        title: 'Error',
        description: 'Please set a notification email address first.',
        variant: 'destructive'
      });
      return;
    }

    setIsTestingSend(true);
    try {
      const testEmailContent = generatePreview();
      
      const { error } = await supabase.functions.invoke('basic-email', {
        body: {
          email: notificationEmail,
          testMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #3b82f6; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">🧪 Test Email - End-of-Chat Template</h2>
              </div>
              <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                <p><strong>This is a test of your custom email template.</strong></p>
                <hr style="margin: 20px 0; border: 1px solid #e2e8f0;">
                <div style="white-space: pre-line; line-height: 1.6;">
                  ${testEmailContent.replace(/\n/g, '<br>')}
                </div>
              </div>
            </div>
          `
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Test Email Sent',
        description: `Test email sent successfully to ${notificationEmail}`,
      });

    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Error',
        description: `Failed to send test email: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setIsTestingSend(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>End-of-Chat Email Settings</CardTitle>
        <CardDescription>
          Customize your email template and set conditions for when emails should be sent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Template Section */}
        <div className="space-y-3">
          <Label htmlFor="email-template" className="text-sm font-medium">
            Email Template
          </Label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">Available variables:</span>
              {TEMPLATE_VARIABLES.map((variable) => (
                <Badge 
                  key={variable}
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                  onClick={() => insertVariable(variable)}
                >
                  {variable}
                </Badge>
              ))}
              {customParameters.map((param) => (
                <Badge 
                  key={param.parameter_name}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                  onClick={() => insertVariable(`{{${param.parameter_name}}}`)}
                >
                  {'{{'}${param.parameter_name}{'}}'}
                </Badge>
              ))}
              {toolParameters.map((param) => (
                <Badge 
                  key={`${param.tool_name}-${param.parameter_name}`}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs border-orange-500 text-orange-700"
                  onClick={() => insertVariable(`{{tool_${param.parameter_name}}}`)}
                >
                  {'{{tool_'}${param.parameter_name}{'}}'}
                </Badge>
              ))}
            </div>
            {toolParameters.length > 0 && (
              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                🛠️ Tool parameters (orange badges) are collected when your custom tools execute during conversations
              </p>
            )}
            <Textarea
              id="email-template"
              value={template}
              onChange={(e) => onTemplateChange(e.target.value)}
              placeholder="Enter your custom email template..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        </div>

        {/* Email Conditions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Email Sending Conditions</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addGroup}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Rule Group
            </Button>
          </div>
          
          {normalizedConditions.groups.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Between groups use:</span>
              <Select 
                value={normalizedConditions.logic} 
                onValueChange={(value: 'AND' | 'OR') => updateMainLogic(value)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            {normalizedConditions.groups.map((group, groupIndex) => (
              <Card key={groupIndex} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Rule Group {groupIndex + 1}</span>
                      {group.rules.length > 1 && (
                        <>
                          <span className="text-xs text-muted-foreground">Logic:</span>
                          <Select 
                            value={group.logic} 
                            onValueChange={(value: 'AND' | 'OR') => updateGroupLogic(groupIndex, value)}
                          >
                            <SelectTrigger className="w-16 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addConditionToGroup(groupIndex)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      {normalizedConditions.groups.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGroup(groupIndex)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.rules.map((rule, ruleIndex) => (
                      <div key={ruleIndex} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30 flex-wrap">
                        {/* Rule Type */}
                        <Select
                          value={rule.type}
                          onValueChange={(value: 'basic' | 'message_content' | 'custom_parameter' | 'parameter_exists') => {
                            // Create a completely new rule when type changes
                            let newRule: EmailConditionRule = {
                              type: value,
                              field: '',
                              operator: 'equals',
                              value: ''
                            };

                            if (value === 'basic') {
                              newRule.field = 'always';
                              newRule.value = 'true';
                            } else if (value === 'message_content') {
                              newRule.field = 'any_message';
                              newRule.operator = 'contains';
                              newRule.sender = 'any';
                              newRule.case_sensitive = false;
                            } else if (value === 'custom_parameter') {
                              newRule.field = 'conversation_length';
                              newRule.operator = 'greater_than';
                              newRule.value = '5';
                            } else if (value === 'parameter_exists') {
                              newRule.field = 'parameter_exists';
                              newRule.operator = 'exists';
                              newRule.parameter_name = customParameters[0]?.parameter_name || '';
                              newRule.value = 'true';
                            }

                            // Update all fields at once using a complete rule replacement
                            const newConditions = {
                              ...normalizedConditions,
                              groups: normalizedConditions.groups.map((group, i) => 
                                i === groupIndex 
                                  ? {
                                      ...group,
                                      rules: group.rules.map((existingRule, j) => 
                                        j === ruleIndex ? newRule : existingRule
                                      )
                                    }
                                  : group
                              )
                            };
                            onConditionsChange(newConditions);
                          }}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Field Selection for different rule types */}
                        {rule.type === 'basic' && (
                          <Select
                            value={rule.field}
                            onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'field', value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BASIC_FIELD_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {rule.type === 'message_content' && (
                          <>
                            <Select
                              value={rule.sender || 'any'}
                              onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'sender', value)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SENDER_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={rule.operator}
                              onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'operator', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TEXT_OPERATORS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={rule.value}
                              onChange={(e) => updateCondition(groupIndex, ruleIndex, 'value', e.target.value)}
                              placeholder="Search text..."
                              className="flex-1 min-w-[120px]"
                            />

                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={rule.case_sensitive || false}
                                onCheckedChange={(checked) => updateCondition(groupIndex, ruleIndex, 'case_sensitive', checked)}
                              />
                              <Label className="text-xs">Case</Label>
                            </div>
                          </>
                        )}

                        {rule.type === 'custom_parameter' && (
                          <>
                            <Select
                              value={rule.field}
                              onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'field', value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CUSTOM_PARAMETER_FIELDS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                                 {customParameters.map((param) => (
                                   <SelectItem key={param.parameter_name} value={param.parameter_name}>
                                     Custom: {param.parameter_name} ({param.parameter_type})
                                   </SelectItem>
                                 ))}
                                 {toolParameters.map((param) => (
                                   <SelectItem key={`tool_${param.parameter_name}`} value={`tool_${param.parameter_name}`}>
                                     Tool "{param.tool_name}": {param.parameter_name} ({param.parameter_type})
                                   </SelectItem>
                                 ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={rule.operator}
                              onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'operator', value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableOperators(rule).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              value={rule.value}
                              onChange={(e) => updateCondition(groupIndex, ruleIndex, 'value', e.target.value)}
                              placeholder="Value..."
                              className="flex-1 min-w-[100px]"
                            />
                          </>
                        )}

                        {rule.type === 'parameter_exists' && (
                          <>
                            <Select
                              value={rule.parameter_name || ''}
                              onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'parameter_name', value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select parameter" />
                              </SelectTrigger>
                               <SelectContent>
                                 {customParameters.map((param) => (
                                   <SelectItem key={param.id} value={param.parameter_name}>
                                     {param.parameter_name} ({param.parameter_type})
                                   </SelectItem>
                                 ))}
                                 {toolParameters.map((param) => (
                                   <SelectItem key={`tool_${param.parameter_name}`} value={`tool_${param.parameter_name}`}>
                                     Tool "{param.tool_name}": {param.parameter_name} ({param.parameter_type})
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                            </Select>

                            <Select
                              value={rule.operator}
                              onValueChange={(value) => updateCondition(groupIndex, ruleIndex, 'operator', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exists">Exists</SelectItem>
                                <SelectItem value="not_exists">Does Not Exist</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}

                        {group.rules.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCondition(groupIndex, ruleIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={sendTestEmail}
            disabled={isTestingSend || !notificationEmail}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTestingSend ? 'Sending...' : 'Send Test Email'}
          </Button>
        </div>

        {/* Preview */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Email Preview (with mock data)</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="p-4 border rounded-lg bg-muted/30 text-sm whitespace-pre-line"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {generatePreview()}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}