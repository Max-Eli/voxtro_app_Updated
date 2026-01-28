import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WebsiteCrawler } from '@/components/WebsiteCrawler';
import { ChatbotActions } from '@/components/ChatbotActions';
import { ChatbotFAQs } from '@/components/ChatbotFAQs';
import { FormSelector } from "@/components/FormSelector";
import { EmailTemplateEditor } from '@/components/EmailTemplateEditor';
import { CustomParameterManager } from '@/components/CustomParameterManager';
import WidgetCustomization from '@/components/WidgetCustomization';
import { ArrowLeft, Bot, Sparkles, Save, Eye, Trash2, MessageCircle, Maximize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)' },
  { value: 'gpt-4o', label: 'GPT-4o (Most Powerful)' },
];

interface Chatbot {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  website_url: string;
  theme_color: string;
  website_content?: string;
  crawl_status?: string;
  last_crawled_at?: string;
  session_timeout_minutes: number;
  welcome_message: string;
  daily_token_limit?: number;
  monthly_token_limit?: number;
  cache_enabled?: boolean;
  cache_duration_hours?: number;
  end_chat_notification_enabled?: boolean;
  end_chat_notification_email?: string;
  email_template?: string;
  hide_branding?: boolean;
  email_conditions?: {
    logic: 'AND' | 'OR';
    groups: Array<{
      logic: 'AND' | 'OR';
      rules: Array<{
        type: 'basic' | 'message_content' | 'custom_parameter';
        field: string;
        operator: string;
        value: string;
        case_sensitive?: boolean;
        sender?: 'user' | 'bot' | 'any';
      }>;
    }>;
  };
  widget_form_buttons?: Array<{
    id: string;
    label: string;
    icon: string;
    formId: string;
    color: string;
  }>;
}

export default function EditChatbot() {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [previewMessages, setPreviewMessages] = useState([]);
  const [previewInput, setPreviewInput] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [availableForms, setAvailableForms] = useState<Array<{id: string; form_name: string; form_title: string}>>([]);
  const [systemPromptDialogOpen, setSystemPromptDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    model: 'gpt-4o-mini',
    temperature: [0.7],
    max_tokens: 1000,
    is_active: true,
    website_url: '',
    theme_color: '#3b82f6',
    theme_color_type: 'solid',
    theme_gradient_start: '#3b82f6',
    theme_gradient_end: '#8b5cf6',
    theme_gradient_angle: 135,
    session_timeout_minutes: 30,
    welcome_message: 'Hi! I\'m here to help you. How can I assist you today?',
    daily_token_limit: 100000,
    monthly_token_limit: 1000000,
    cache_enabled: true,
    cache_duration_hours: 168,
    end_chat_notification_enabled: false,
    end_chat_notification_email: '',
    email_template: '',
    email_conditions: {
      logic: 'AND' as const,
      groups: [{
        logic: 'AND' as const,
        rules: [{ type: 'basic' as const, field: 'always', operator: 'equals', value: 'true' }]
      }]
    },
    widget_button_text: 'Chat with us',
    widget_position: 'bottom-right',
    widget_button_color: '#3b82f6',
    widget_text_color: '#ffffff',
    widget_size: 'medium',
    widget_border_radius: '50%',
    widget_custom_css: '',
    widget_form_buttons: [],
    widget_form_buttons_layout: 'vertical',
    hide_branding: false
  });

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (chatbotId) {
      fetchChatbot();
      fetchAvailableForms();
    }
  }, [chatbotId]);

  const fetchChatbot = async () => {
    try {
      // RLS policies handle access control - allow team members to access teammate's chatbots
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('id', chatbotId)
        .single();

      if (error || !data) {
        throw new Error('Chatbot not found or you do not have permission to edit it');
      }

      setChatbot(data as unknown as Chatbot);

      setFormData({
        name: data.name,
        description: data.description || '',
        system_prompt: data.system_prompt,
        model: data.model,
        temperature: [data.temperature],
        max_tokens: data.max_tokens,
        is_active: data.is_active,
        website_url: data.website_url || '',
        theme_color: data.theme_color,
        theme_color_type: (data as any).theme_color_type || 'solid',
        theme_gradient_start: (data as any).theme_gradient_start || '#3b82f6',
        theme_gradient_end: (data as any).theme_gradient_end || '#8b5cf6',
        theme_gradient_angle: (data as any).theme_gradient_angle || 135,
        session_timeout_minutes: data.session_timeout_minutes || 30,
        welcome_message: data.welcome_message || 'Hi! I\'m here to help you. How can I assist you today?',
        daily_token_limit: data.daily_token_limit || 100000,
        monthly_token_limit: data.monthly_token_limit || 1000000,
        cache_enabled: data.cache_enabled ?? true,
        cache_duration_hours: data.cache_duration_hours || 168,
        end_chat_notification_enabled: data.end_chat_notification_enabled || false,
        end_chat_notification_email: data.end_chat_notification_email || '',
        email_template: data.email_template || '',
        email_conditions: (typeof data.email_conditions === 'object' && data.email_conditions !== null) 
          ? (((data.email_conditions as any).groups) 
              ? (data.email_conditions as any)
              : {
                  logic: 'AND',
                  groups: [{
                    logic: 'AND',
                    rules: ((data.email_conditions as any).rules)?.map((rule: any) => ({
                      type: 'basic',
                      ...rule
                    })) || [{ type: 'basic', field: 'always', operator: 'equals', value: 'true' }]
                  }]
                }
            )
          : {
              logic: 'AND',
              groups: [{
                logic: 'AND',
                rules: [{ type: 'basic', field: 'always', operator: 'equals', value: 'true' }]
              }]
            },
        widget_button_text: data.widget_button_text || 'Chat with us',
        widget_position: data.widget_position || 'bottom-right',
        widget_button_color: data.widget_button_color || '#3b82f6',
        widget_text_color: data.widget_text_color || '#ffffff',
        widget_size: data.widget_size || 'medium',
        widget_border_radius: data.widget_border_radius || '50%',
        widget_custom_css: data.widget_custom_css || '',
        widget_form_buttons: Array.isArray(data.widget_form_buttons) ? data.widget_form_buttons : [],
        widget_form_buttons_layout: data.widget_form_buttons_layout || 'vertical',
        hide_branding: data.hide_branding || false
        // Removed overlay customization properties that don't exist in current schema
      });

      // Initialize preview with welcome message
      setPreviewMessages([{
        role: 'assistant',
        content: data.welcome_message || 'Hi! I\'m here to help you. How can I assist you today?',
        timestamp: new Date()
      }]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchAvailableForms = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_forms')
        .select('id, form_name, form_title')
        .eq('chatbot_id', chatbotId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching forms:', error);
        return;
      }

      setAvailableForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update preview welcome message when welcome_message changes
    if (field === 'welcome_message' && value) {
      setPreviewMessages([{
        role: 'assistant',
        content: value,
        timestamp: new Date()
      }]);
    }
  };

  // Handle input changes for WidgetCustomization component
  const handleWidgetInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    handleInputChange(name, value);
  };

  const handleCrawlComplete = () => {
    // Refresh the chatbot data
    fetchChatbot();
    toast({
      title: 'Website Crawled',
      description: 'Your website content has been updated.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Detect changes for changelog
      const fieldsToTrack = ['name', 'description', 'system_prompt', 'model', 'welcome_message', 'is_active', 'theme_color', 'max_tokens', 'daily_token_limit', 'monthly_token_limit'];
      const previousValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      
      if (chatbot) {
        for (const field of fieldsToTrack) {
          const oldVal = (chatbot as any)[field];
          const newVal = field === 'temperature' ? formData.temperature[0] : (formData as any)[field];
          if (oldVal !== newVal) {
            previousValues[field] = oldVal;
            newValues[field] = newVal;
          }
        }
      }

      // RLS policies handle access control - allow team members to update teammate's chatbots
      const { error } = await supabase
        .from('chatbots')
        .update({
          ...formData,
          temperature: formData.temperature[0],
        })
        .eq('id', chatbotId);

      if (error) throw error;

      // Create changelog entry if there were changes
      if (Object.keys(newValues).length > 0 && chatbotId && user) {
        const changedFields = Object.keys(newValues).join(', ');
        await supabase.from('changelog_entries').insert({
          user_id: user.id,
          entity_type: 'chatbot',
          entity_id: chatbotId,
          change_type: 'update',
          title: `Configuration updated: ${changedFields}`,
          description: `Updated settings for chatbot "${formData.name}"`,
          previous_values: previousValues,
          new_values: newValues,
          status: null,
          source: 'auto',
        });
      }

      toast({
        title: 'Success!',
        description: 'Your chatbot has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update chatbot',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this chatbot? This action cannot be undone.')) {
      return;
    }

    setLoading(true);

    try {
      // RLS policies handle access control - allow team members to delete teammate's chatbots
      const { error } = await supabase
        .from('chatbots')
        .delete()
        .eq('id', chatbotId);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Chatbot deleted successfully.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete chatbot',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (chatbotId) {
      window.open(`/embed/${chatbotId}`, '_blank');
    }
  };

  const sendPreviewMessage = async () => {
    if (!previewInput.trim() || previewLoading) return;

    const userMessage = {
      role: 'user',
      content: previewInput.trim(),
      timestamp: new Date()
    };

    setPreviewMessages(prev => [...prev, userMessage]);
    setPreviewInput('');
    setPreviewLoading(true);

    try {
      // Create a direct OpenAI API call for preview with current form data
      const messages = [
        { role: 'system', content: formData.system_prompt },
        ...previewMessages.filter(m => m.role !== 'system').map(m => ({ 
          role: m.role, 
          content: m.content.replace(' (Live Preview)', '') 
        })),
        { role: 'user', content: userMessage.content }
      ];

      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://api.voxtro.io').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbot_id: chatbotId,
          messages: messages.slice(1), // Remove system message as it's handled by the API
          visitor_id: 'preview_' + Date.now(),
          preview_mode: true,
          preview_config: {
            system_prompt: formData.system_prompt,
            model: formData.model,
            temperature: formData.temperature[0],
            max_tokens: formData.max_tokens
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setPreviewMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Preview error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Preview is testing your current settings. The AI will respond based on your saved configuration when the chatbot is deployed.',
        timestamp: new Date()
      };
      setPreviewMessages(prev => [...prev, errorMessage]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendPreviewMessage();
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading chatbot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Edit Chatbot</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Form Section */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Basic Information
                    </CardTitle>
                    <CardDescription>
                      Configure the basic settings for your chatbot
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Chatbot Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., Customer Support Bot"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Brief description of what this chatbot does..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="welcome_message">Welcome Message</Label>
                      <Textarea
                        id="welcome_message"
                        value={formData.welcome_message}
                        onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                        placeholder="Hi! I'm here to help you. How can I assist you today?"
                        rows={2}
                      />
                      <p className="text-sm text-muted-foreground">
                        The first message visitors see when they open the chat
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website_url">Website URL</Label>
                      <Input
                        id="website_url"
                        value={formData.website_url}
                        onChange={(e) => handleInputChange('website_url', e.target.value)}
                        placeholder="https://yourwebsite.com"
                        type="url"
                      />
                    </div>

                    {/* Website Crawler */}
                    <WebsiteCrawler
                      chatbotId={chatbot?.id}
                      websiteUrl={formData.website_url}
                      websiteContent={chatbot?.website_content}
                      crawlStatus={chatbot?.crawl_status}
                      lastCrawledAt={chatbot?.last_crawled_at}
                      onWebsiteUpdate={(url) => handleInputChange('website_url', url)}
                      onCrawlComplete={handleCrawlComplete}
                    />
                  </CardContent>
                </Card>

                {/* Actions & Functions */}
                <ChatbotActions chatbotId={chatbotId || ''} />

                {/* FAQ Management */}
                <ChatbotFAQs chatbotId={chatbotId || ''} />

                {/* Widget Customization */}
                <WidgetCustomization
                  formData={formData}
                  onChange={handleWidgetInputChange}
                  availableForms={availableForms}
                />

                {/* AI Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Configuration</CardTitle>
                    <CardDescription>
                      Configure how your chatbot thinks and responds
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="system_prompt">System Prompt *</Label>
                      <div className="relative">
                        <Textarea
                          id="system_prompt"
                          value={formData.system_prompt}
                          onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                          placeholder="Define how your chatbot should behave..."
                          rows={4}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-background"
                          onClick={() => setSystemPromptDialogOpen(true)}
                          title="Expand editor"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This instruction tells the AI how to behave and what its role is.
                      </p>
                    </div>

                    {/* System Prompt Expanded Dialog */}
                    <Dialog open={systemPromptDialogOpen} onOpenChange={setSystemPromptDialogOpen}>
                      <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Edit System Prompt</DialogTitle>
                        </DialogHeader>
                        <Textarea
                          value={formData.system_prompt}
                          onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                          placeholder="Define how your chatbot should behave..."
                          className="min-h-[60vh] font-mono text-sm"
                        />
                      </DialogContent>
                    </Dialog>

                    <div className="space-y-2">
                      <Label htmlFor="model">AI Model</Label>
                      <Select
                        value={formData.model}
                        onValueChange={(value) => handleInputChange('model', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Creativity Level: {formData.temperature[0]}
                      </Label>
                      <Slider
                        value={formData.temperature}
                        onValueChange={(value) => handleInputChange('temperature', value)}
                        max={2}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Focused (0.0)</span>
                        <span>Balanced (1.0)</span>
                        <span>Creative (2.0)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_tokens">Response Length (tokens)</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={formData.max_tokens}
                        onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                        min={100}
                        max={4000}
                      />
                      <p className="text-sm text-muted-foreground">
                        Higher values allow longer responses (~4 characters per token)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
                      <Input
                        id="session_timeout_minutes"
                        type="number"
                        value={formData.session_timeout_minutes}
                        onChange={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                        min={1}
                        max={1440}
                      />
                      <p className="text-sm text-muted-foreground">
                        Chat resets after this many minutes of inactivity (max 24 hours)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Usage Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Limits</CardTitle>
                    <CardDescription>
                      Set daily and monthly token limits to control usage and costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="daily_token_limit">Daily Token Limit</Label>
                      <Input
                        id="daily_token_limit"
                        type="number"
                        value={formData.daily_token_limit}
                        onChange={(e) => handleInputChange('daily_token_limit', parseInt(e.target.value) || 0)}
                        min={0}
                        placeholder="100000"
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum tokens your chatbot can use per day. Set to 0 for unlimited.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthly_token_limit">Monthly Token Limit</Label>
                      <Input
                        id="monthly_token_limit"
                        type="number"
                        value={formData.monthly_token_limit}
                        onChange={(e) => handleInputChange('monthly_token_limit', parseInt(e.target.value) || 0)}
                        min={0}
                        placeholder="1000000"
                      />
                      <p className="text-sm text-muted-foreground">
                        Maximum tokens your chatbot can use per month. Set to 0 for unlimited.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Response Caching</Label>
                        <p className="text-sm text-muted-foreground">
                          Cache similar responses to reduce token usage
                        </p>
                      </div>
                      <Switch
                        checked={formData.cache_enabled}
                        onCheckedChange={(checked) => handleInputChange('cache_enabled', checked)}
                      />
                    </div>

                    {formData.cache_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="cache_duration_hours">Cache Duration (hours)</Label>
                        <Input
                          id="cache_duration_hours"
                          type="number"
                          value={formData.cache_duration_hours}
                          onChange={(e) => handleInputChange('cache_duration_hours', parseInt(e.target.value) || 0)}
                          min={1}
                          max={8760}
                          placeholder="168"
                        />
                        <p className="text-sm text-muted-foreground">
                          How long to keep cached responses (1-8760 hours, default: 168 hours = 1 week)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Appearance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                      Customize how your chatbot looks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Color Type</Label>
                        <Select
                          value={formData.theme_color_type || 'solid'}
                          onValueChange={(value) => handleInputChange('theme_color_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solid">Solid Color</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.theme_color_type === 'gradient' ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="theme_gradient_start">Gradient Start</Label>
                            <div className="flex space-x-2">
                              <Input
                                id="theme_gradient_start"
                                name="theme_gradient_start"
                                type="color"
                                value={formData.theme_gradient_start || "#3b82f6"}
                                onChange={(e) => handleInputChange('theme_gradient_start', e.target.value)}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                name="theme_gradient_start"
                                value={formData.theme_gradient_start || "#3b82f6"}
                                onChange={(e) => handleInputChange('theme_gradient_start', e.target.value)}
                                placeholder="#3b82f6"
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="theme_gradient_end">Gradient End</Label>
                            <div className="flex space-x-2">
                              <Input
                                id="theme_gradient_end"
                                name="theme_gradient_end"
                                type="color"
                                value={formData.theme_gradient_end || "#8b5cf6"}
                                onChange={(e) => handleInputChange('theme_gradient_end', e.target.value)}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                name="theme_gradient_end"
                                value={formData.theme_gradient_end || "#8b5cf6"}
                                onChange={(e) => handleInputChange('theme_gradient_end', e.target.value)}
                                placeholder="#8b5cf6"
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="theme_gradient_angle">Gradient Angle</Label>
                            <div className="flex items-center gap-3">
                              <Slider
                                id="theme_gradient_angle"
                                value={[formData.theme_gradient_angle || 135]}
                                onValueChange={(value) => handleInputChange('theme_gradient_angle', value[0])}
                                min={0}
                                max={360}
                                step={15}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium w-12">{formData.theme_gradient_angle || 135}°</span>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border" style={{
                            background: `linear-gradient(${formData.theme_gradient_angle || 135}deg, ${formData.theme_gradient_start || '#3b82f6'}, ${formData.theme_gradient_end || '#8b5cf6'})`
                          }}>
                            <p className="text-white text-sm font-medium text-center">Preview</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="theme_color">Theme Color</Label>
                          <div className="flex space-x-2">
                            <Input
                              id="theme_color"
                              name="theme_color"
                              type="color"
                              value={formData.theme_color || "#3b82f6"}
                              onChange={(e) => handleInputChange('theme_color', e.target.value)}
                              className="w-16 h-10 p-1 border rounded"
                            />
                            <Input
                              name="theme_color"
                              value={formData.theme_color || "#3b82f6"}
                              onChange={(e) => handleInputChange('theme_color', e.target.value)}
                              placeholder="#3b82f6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground">
                        Choose a solid color or gradient for your chatbot's theme
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Active Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable this chatbot to respond to messages
                        </p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Hide Branding</Label>
                        <p className="text-sm text-muted-foreground">
                          Remove "Powered by Voxtro" from the chat widget
                        </p>
                      </div>
                      <Switch
                        checked={formData.hide_branding}
                        onCheckedChange={(checked) => handleInputChange('hide_branding', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* End of Chat Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>End of Chat Notifications</CardTitle>
                    <CardDescription>
                      Get notified when conversations with your chatbot end
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable End of Chat Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive email notifications when conversations end due to inactivity
                        </p>
                      </div>
                      <Switch
                        checked={formData.end_chat_notification_enabled}
                        onCheckedChange={(checked) => handleInputChange('end_chat_notification_enabled', checked)}
                      />
                    </div>

                    {formData.end_chat_notification_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="end_chat_notification_email">Notification Email</Label>
                        <Input
                          id="end_chat_notification_email"
                          type="email"
                          value={formData.end_chat_notification_email}
                          onChange={(e) => handleInputChange('end_chat_notification_email', e.target.value)}
                          placeholder="notifications@yourdomain.com"
                        />
                        <p className="text-sm text-muted-foreground">
                          Email address where end-of-chat notifications will be sent. This can be different from your account email.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Email Template Settings */}
                {formData.end_chat_notification_enabled && (
                  <div className="space-y-6">
                    <CustomParameterManager 
                      chatbotId={chatbotId || ''}
                    />
                    <EmailTemplateEditor
                      chatbotId={chatbotId || ''}
                      template={formData.email_template}
                      conditions={formData.email_conditions}
                      notificationEmail={formData.end_chat_notification_email}
                      onTemplateChange={(template) => handleInputChange('email_template', template)}
                      onConditionsChange={(conditions) => handleInputChange('email_conditions', conditions)}
                    />
                  </div>
                )}

                {/* Connected Forms */}
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Forms</CardTitle>
                    <CardDescription>
                      Manage which forms are active for this chatbot. Create new forms in the Forms section.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormSelector chatbotId={chatbotId || ''} />
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePreview}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-2">
              <div className="sticky top-8 space-y-6">
                {/* Live Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Live Preview</CardTitle>
                    <CardDescription>
                      Test your chatbot configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Chatbot Preview Widget */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={
                            formData.theme_color_type === 'gradient'
                              ? { background: `linear-gradient(${formData.theme_gradient_angle}deg, ${formData.theme_gradient_start}, ${formData.theme_gradient_end})` }
                              : { backgroundColor: formData.theme_color }
                          }
                        />
                        <span className="font-medium text-sm">
                          {formData.name || 'Your Chatbot'}
                        </span>
                      </div>
                      
                      {/* Interactive Messages */}
                      <div className="space-y-2 text-sm max-h-48 overflow-y-auto mb-3">
                        {previewMessages.map((message, index) => (
                          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[85%] p-2 rounded text-xs ${
                                message.role === 'user'
                                  ? 'text-white'
                                  : 'bg-background border'
                              }`}
                              style={
                                message.role === 'user' 
                                  ? (formData.theme_color_type === 'gradient'
                                      ? { background: `linear-gradient(${formData.theme_gradient_angle}deg, ${formData.theme_gradient_start}, ${formData.theme_gradient_end})` }
                                      : { backgroundColor: formData.theme_color })
                                  : {}
                              }
                            >
                              {message.content}
                            </div>
                          </div>
                        ))}
                        
                        {previewLoading && (
                          <div className="flex justify-start">
                            <div className="bg-background border p-2 rounded text-xs">
                              <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Test your chatbot..." 
                          className="flex-1 text-sm"
                          value={previewInput}
                          onChange={(e) => setPreviewInput(e.target.value)}
                          onKeyPress={handlePreviewKeyPress}
                          disabled={previewLoading}
                        />
                        <Button 
                          size="sm" 
                          style={
                            formData.theme_color_type === 'gradient'
                              ? { background: `linear-gradient(${formData.theme_gradient_angle}deg, ${formData.theme_gradient_start}, ${formData.theme_gradient_end})` }
                              : { backgroundColor: formData.theme_color }
                          }
                          onClick={sendPreviewMessage}
                          disabled={previewLoading || !previewInput.trim()}
                          className="text-white"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Widget Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Widget Preview</CardTitle>
                    <CardDescription>
                      How the chat widget appears on your website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Mock Website with Chat Widget */}
                    <div className="relative border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 h-48 overflow-hidden">
                      {/* Mock Website Content */}
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      </div>
                      
                      {/* Chat Widget Button - Dynamic positioning and styling */}
                      <div 
                        className={`absolute flex items-center justify-center shadow-lg cursor-pointer transform hover:scale-105 transition-all duration-200 text-sm font-medium ${
                          formData.widget_position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                          formData.widget_position === 'top-left' ? 'top-4 left-4' :
                          formData.widget_position === 'top-right' ? 'top-4 right-4' :
                          formData.widget_position === 'bottom-left' ? 'bottom-4 left-4' :
                          'bottom-4 right-4'
                        } ${
                          formData.widget_size === 'small' ? 'w-12 h-12 text-xs' :
                          formData.widget_size === 'large' ? 'w-20 h-20 text-base' :
                          'w-16 h-16 text-sm'
                        }`}
                        style={{ 
                          backgroundColor: formData.widget_button_color || '#3b82f6',
                          color: formData.widget_text_color,
                          borderRadius: formData.widget_border_radius
                        }}
                      >
                        {formData.widget_position === 'center' ? (
                          <span className="px-4 py-2">{formData.widget_button_text}</span>
                        ) : (
                          <MessageCircle className={`${
                            formData.widget_size === 'small' ? 'h-4 w-4' :
                            formData.widget_size === 'large' ? 'h-8 w-8' :
                            'h-6 w-6'
                          }`} />
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-600 space-y-1">
                      <div><strong>Position:</strong> {formData.widget_position}</div>
                      <div><strong>Size:</strong> {formData.widget_size}</div>
                      <div><strong>Button Text:</strong> {formData.widget_button_text}</div>
                      <div><strong>Colors:</strong> Button: {formData.widget_button_color}, Text: {formData.widget_text_color}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}