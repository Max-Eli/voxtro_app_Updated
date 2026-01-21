import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText, Edit2, Trash2, Eye, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface ChatbotForm {
  id: string;
  form_name: string;
  form_title: string;
  form_description?: string;
  fields: FormField[];
  is_active: boolean;
  trigger_keywords: string[];
  success_message: string;
  notify_email: boolean;
  notification_email?: string;
  email_subject: string;
  webhook_enabled: boolean;
  webhook_url?: string;
  terms_and_conditions?: string;
  require_terms_acceptance: boolean;
  created_at: string;
}

interface ChatbotFormsProps {
  chatbotId: string;
}

export function ChatbotForms({ chatbotId }: ChatbotFormsProps) {
  const [forms, setForms] = useState<ChatbotForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingForm, setEditingForm] = useState<ChatbotForm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form creation/editing state
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [triggerKeywords, setTriggerKeywords] = useState('');
  const [successMessage, setSuccessMessage] = useState('Thank you for submitting the form!');
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('New Form Submission');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [requireTermsAcceptance, setRequireTermsAcceptance] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (chatbotId) {
      fetchForms();
    }
  }, [chatbotId]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_forms')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms((data || []).map(form => ({
        ...form,
        fields: Array.isArray(form.fields) ? form.fields as unknown as FormField[] : []
      })));
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const resetFormState = () => {
    setFormName('');
    setFormTitle('');
    setFormDescription('');
    setTriggerKeywords('');
    setSuccessMessage('Thank you for submitting the form!');
    setNotifyEmail(false);
    setNotificationEmail('');
    setEmailSubject('New Form Submission');
    setWebhookEnabled(false);
    setWebhookUrl('');
    setTermsAndConditions('');
    setRequireTermsAcceptance(false);
    setFields([]);
    setEditingForm(null);
    setIsDialogOpen(false);
  };

  const startEditing = (form: ChatbotForm) => {
    setEditingForm(form);
    setFormName(form.form_name);
    setFormTitle(form.form_title);
    setFormDescription(form.form_description || '');
    setTriggerKeywords(form.trigger_keywords.join(', '));
    setSuccessMessage(form.success_message);
    setNotifyEmail(form.notify_email || false);
    setNotificationEmail(form.notification_email || '');
    setEmailSubject(form.email_subject || 'New Form Submission');
    setWebhookEnabled(form.webhook_enabled || false);
    setWebhookUrl(form.webhook_url || '');
    setTermsAndConditions(form.terms_and_conditions || '');
    setRequireTermsAcceptance(form.require_terms_acceptance || false);
    setFields(form.fields);
    setIsDialogOpen(true);
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false
    };
    setFields(prev => [...prev, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(prev => prev.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    ));
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const saveForm = async () => {
    if (!formName.trim() || !formTitle.trim() || fields.length === 0) {
      toast.error('Please fill in all required fields and add at least one form field');
      return;
    }

    if (notifyEmail && !notificationEmail.trim()) {
      toast.error('Please enter a notification email address');
      return;
    }

    if (webhookEnabled && !webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    if (requireTermsAcceptance && !termsAndConditions.trim()) {
      toast.error('Please enter terms and conditions text');
      return;
    }

    setIsCreating(true);
    
    try {
      const formData = {
        chatbot_id: chatbotId,
        form_name: formName.trim(),
        form_title: formTitle.trim(),
        form_description: formDescription.trim() || null,
        fields: fields as any,
        trigger_keywords: triggerKeywords.split(',').map(k => k.trim()).filter(k => k),
        success_message: successMessage.trim(),
        notify_email: notifyEmail,
        notification_email: notifyEmail ? notificationEmail.trim() || null : null,
        email_subject: emailSubject.trim(),
        webhook_enabled: webhookEnabled,
        webhook_url: webhookEnabled ? webhookUrl.trim() || null : null,
        terms_and_conditions: termsAndConditions.trim() || null,
        require_terms_acceptance: requireTermsAcceptance
      };

      let result;
      if (editingForm) {
        result = await supabase
          .from('chatbot_forms')
          .update(formData)
          .eq('id', editingForm.id)
          .select();
      } else {
        result = await supabase
          .from('chatbot_forms')
          .insert(formData)
          .select();
      }

      if (result.error) throw result.error;

      toast.success(editingForm ? 'Form updated successfully!' : 'Form created successfully!');
      resetFormState();
      fetchForms();
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleFormStatus = async (formId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbot_forms')
        .update({ is_active: !isActive })
        .eq('id', formId);

      if (error) throw error;
      
      toast.success(`Form ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchForms();
    } catch (error) {
      console.error('Error updating form status:', error);
      toast.error('Failed to update form status');
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('chatbot_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;
      
      toast.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chatbot Forms</h2>
          <p className="text-muted-foreground">Create forms that your chatbot can send to users</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetFormState();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingForm ? 'Edit Form' : 'Create New Form'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Form Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Form Name *</Label>
                  <Input
                    id="form-name"
                    placeholder="Contact Form"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-title">Form Title *</Label>
                  <Input
                    id="form-title"
                    placeholder="Get in Touch"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-description">Form Description</Label>
                <Textarea
                  id="form-description"
                  placeholder="Please fill out this form so we can help you better."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trigger-keywords">Trigger Keywords</Label>
                  <Input
                    id="trigger-keywords"
                    placeholder="contact, form, get in touch"
                    value={triggerKeywords}
                    onChange={(e) => setTriggerKeywords(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated keywords that trigger this form</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="success-message">Success Message</Label>
                  <Input
                    id="success-message"
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notifications</h3>
                
                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="notify-email"
                      checked={notifyEmail}
                      onCheckedChange={setNotifyEmail}
                    />
                    <Label htmlFor="notify-email">Send email notification when form is submitted</Label>
                  </div>

                  {notifyEmail && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="notification-email">Notification Email *</Label>
                        <Input
                          id="notification-email"
                          type="email"
                          placeholder="notifications@example.com"
                          value={notificationEmail}
                          onChange={(e) => setNotificationEmail(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Email address to receive form submissions</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-subject">Email Subject</Label>
                        <Input
                          id="email-subject"
                          placeholder="New Form Submission"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Webhook Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="webhook-enabled"
                      checked={webhookEnabled}
                      onCheckedChange={setWebhookEnabled}
                    />
                    <Label htmlFor="webhook-enabled">Send webhook when form is submitted</Label>
                  </div>

                  {webhookEnabled && (
                    <div className="pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="webhook-url">Webhook URL *</Label>
                        <Input
                          id="webhook-url"
                          type="url"
                          placeholder="https://your-webhook-endpoint.com/webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          URL where form data will be sent as POST request with JSON payload
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Terms and Conditions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Terms and Conditions</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require-terms"
                      checked={requireTermsAcceptance}
                      onCheckedChange={setRequireTermsAcceptance}
                    />
                    <Label htmlFor="require-terms">Require users to accept terms and conditions</Label>
                  </div>

                  {requireTermsAcceptance && (
                    <div className="pl-6 space-y-2">
                      <Label htmlFor="terms-text">Terms and Conditions Text *</Label>
                      <Textarea
                        id="terms-text"
                        placeholder="By submitting this form, you agree to our privacy policy and terms of service..."
                        value={termsAndConditions}
                        onChange={(e) => setTermsAndConditions(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        This text will be displayed to users who must accept it before submitting the form
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Form Fields</h3>
                  <Button onClick={addField} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-3">
                        <Label>Field Type</Label>
                        <Select 
                          value={field.type} 
                          onValueChange={(value: any) => updateField(index, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="radio">Radio</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-3">
                        <Label>Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Field label"
                        />
                      </div>
                      
                      <div className="col-span-3">
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                        />
                      </div>

                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="col-span-2">
                          <Label>Options</Label>
                          <Input
                            value={(field.options || []).join(', ')}
                            onChange={(e) => updateField(index, { 
                              options: e.target.value.split(',').map(o => o.trim()).filter(o => o)
                            })}
                            placeholder="Option 1, Option 2"
                          />
                        </div>
                      )}
                      
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required || false}
                            onCheckedChange={(checked) => updateField(index, { required: checked })}
                          />
                          <Label className="text-xs">Required</Label>
                        </div>
                      </div>
                      
                      <div className="col-span-1">
                        <Button
                          onClick={() => removeField(index)}
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No fields added yet. Click "Add Field" to get started.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  onClick={saveForm}
                  disabled={isCreating}
                >
                  {isCreating ? 'Saving...' : (editingForm ? 'Update Form' : 'Create Form')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Forms List */}
      {forms.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No forms created yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first form to collect information from chat users
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {form.form_title}
                      {form.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.form_description || 'No description provided'}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => toggleFormStatus(form.id, form.is_active)}
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {form.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <Button
                      onClick={() => startEditing(form)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      onClick={() => deleteForm(form.id)}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fields:</span>
                    <span className="font-medium">{form.fields.length}</span>
                  </div>
                  
                  {form.trigger_keywords.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Triggers:</span>
                      <div className="flex gap-1">
                        {form.trigger_keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {form.notify_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Email notifications:</span>
                      <Badge variant="secondary" className="text-xs">
                        {form.notification_email}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}