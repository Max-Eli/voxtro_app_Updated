import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Plus, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomParameter {
  id?: string;
  parameter_name: string;
  parameter_type: 'text' | 'number' | 'boolean' | 'email' | 'phone';
  extraction_rules: {
    patterns?: string[];
    context_keywords?: string[];
    validation_regex?: string;
  };
  is_required: boolean;
  validation_rules: {
    min_length?: number;
    max_length?: number;
    required_format?: string;
  };
}

interface CustomParameterManagerProps {
  chatbotId: string;
  onParametersChange?: (parameters: CustomParameter[]) => void;
}

const PARAMETER_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' }
];

const DEFAULT_EXTRACTION_RULES = {
  text: { patterns: ['name is *', 'my name is *', 'call me *'] },
  email: { patterns: ['email is *', 'my email is *', 'contact me at *'], validation_regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
  phone: { patterns: ['phone is *', 'my phone is *', 'call me at *'], validation_regex: '^[\\+]?[1-9][\\d]{0,15}$' },
  number: { patterns: ['age is *', 'I am * years old'] },
  boolean: { patterns: ['yes', 'no', 'true', 'false'] }
};

export function CustomParameterManager({ chatbotId, onParametersChange }: CustomParameterManagerProps) {
  const [parameters, setParameters] = useState<CustomParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadParameters();
  }, [chatbotId]);

  const loadParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_custom_parameters')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('created_at');

      if (error) throw error;

      const formattedParams: CustomParameter[] = data?.map(param => ({
        id: param.id,
        parameter_name: param.parameter_name,
        parameter_type: param.parameter_type as any,
        extraction_rules: (param.extraction_rules as any) || {},
        is_required: param.is_required,
        validation_rules: (param.validation_rules as any) || {}
      })) || [];

      setParameters(formattedParams);
      onParametersChange?.(formattedParams);
    } catch (error: any) {
      console.error('Error loading parameters:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom parameters',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addParameter = () => {
    const newParam: CustomParameter = {
      parameter_name: '',
      parameter_type: 'text',
      extraction_rules: DEFAULT_EXTRACTION_RULES.text,
      is_required: false,
      validation_rules: {}
    };
    setParameters([...parameters, newParam]);
  };

  const updateParameter = (index: number, updates: Partial<CustomParameter>) => {
    const updatedParams = parameters.map((param, i) => {
      if (i === index) {
        const updated = { ...param, ...updates };
        
        // Update extraction rules when type changes
        if (updates.parameter_type && updates.parameter_type !== param.parameter_type) {
          updated.extraction_rules = DEFAULT_EXTRACTION_RULES[updates.parameter_type] || {};
        }
        
        return updated;
      }
      return param;
    });
    setParameters(updatedParams);
  };

  const removeParameter = (index: number) => {
    const paramToRemove = parameters[index];
    setParameters(parameters.filter((_, i) => i !== index));
    
    // If parameter exists in database, delete it
    if (paramToRemove.id) {
      deleteParameterFromDB(paramToRemove.id);
    }
  };

  const deleteParameterFromDB = async (parameterId: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_custom_parameters')
        .delete()
        .eq('id', parameterId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting parameter:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete parameter',
        variant: 'destructive'
      });
    }
  };

  const saveParameters = async () => {
    setIsSaving(true);
    try {
      // Validate parameters
      const invalidParams = parameters.filter(p => !p.parameter_name.trim());
      if (invalidParams.length > 0) {
        toast({
          title: 'Validation Error',
          description: 'All parameters must have a name',
          variant: 'destructive'
        });
        return;
      }

      // Check for duplicate names
      const names = parameters.map(p => p.parameter_name.toLowerCase().trim());
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) {
        toast({
          title: 'Validation Error',
          description: 'Parameter names must be unique',
          variant: 'destructive'
        });
        return;
      }

      // Delete existing parameters for this chatbot
      const { error: deleteError } = await supabase
        .from('chatbot_custom_parameters')
        .delete()
        .eq('chatbot_id', chatbotId);

      if (deleteError) throw deleteError;

      // Insert new parameters
      if (parameters.length > 0) {
        const { error: insertError } = await supabase
          .from('chatbot_custom_parameters')
          .insert(
            parameters.map(param => ({
              chatbot_id: chatbotId,
              parameter_name: param.parameter_name.trim(),
              parameter_type: param.parameter_type,
              extraction_rules: param.extraction_rules,
              is_required: param.is_required,
              validation_rules: param.validation_rules
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'Custom parameters saved successfully'
      });

      // Reload parameters to get IDs
      await loadParameters();

    } catch (error: any) {
      console.error('Error saving parameters:', error);
      toast({
        title: 'Error',
        description: 'Failed to save parameters',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading parameters...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Custom Parameters
        </CardTitle>
        <CardDescription>
          Define custom parameters your chatbot should extract from conversations. These can be used in email conditions and templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parameters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No custom parameters defined yet.</p>
            <p className="text-sm">Add parameters to extract structured data from conversations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {parameters.map((param, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  {/* Parameter Name and Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`param-name-${index}`}>Parameter Name</Label>
                      <Input
                        id={`param-name-${index}`}
                        value={param.parameter_name}
                        onChange={(e) => updateParameter(index, { parameter_name: e.target.value })}
                        placeholder="e.g., name, email, phone_number"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`param-type-${index}`}>Type</Label>
                      <Select
                        value={param.parameter_type}
                        onValueChange={(value: any) => updateParameter(index, { parameter_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARAMETER_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`param-required-${index}`}
                        checked={param.is_required}
                        onCheckedChange={(checked) => updateParameter(index, { is_required: checked })}
                      />
                      <Label htmlFor={`param-required-${index}`}>Required</Label>
                    </div>
                  </div>

                  {/* Extraction Patterns */}
                  <div>
                    <Label htmlFor={`param-patterns-${index}`}>Extraction Patterns</Label>
                    <Textarea
                      id={`param-patterns-${index}`}
                      value={(param.extraction_rules.patterns || []).join('\n')}
                      onChange={(e) => updateParameter(index, {
                        extraction_rules: {
                          ...param.extraction_rules,
                          patterns: e.target.value.split('\n').filter(p => p.trim())
                        }
                      })}
                      placeholder="Enter patterns (one per line):&#10;my name is *&#10;call me *&#10;email is *"
                      className="min-h-[80px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use * as wildcard. Example: "my name is *" will extract "John" from "my name is John"
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParameter(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={addParameter}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Parameter
          </Button>
          
          {parameters.length > 0 && (
            <Button
              onClick={saveParameters}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Parameters'}
            </Button>
          )}
        </div>

        {parameters.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Usage in Email Conditions:</strong> Once saved, these parameters will be available in the email conditions as "Parameter Exists/Does Not Exist" and "Parameter Value" conditions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}