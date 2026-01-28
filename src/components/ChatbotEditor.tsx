import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { WebsiteCrawler } from '@/components/WebsiteCrawler';
import { ChatbotActions } from '@/components/ChatbotActions';
import { ChatbotFAQs } from '@/components/ChatbotFAQs';
import { FormSelector } from "@/components/FormSelector";
import { EmailTemplateEditor } from '@/components/EmailTemplateEditor';
import { CustomParameterManager } from '@/components/CustomParameterManager';
import WidgetCustomization from '@/components/WidgetCustomization';
import { Bot, Sparkles, Save, Eye, MessageCircle, Maximize2, Loader2 } from 'lucide-react';
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
  email_conditions?: any;
  widget_form_buttons?: any[];
}

interface ChatbotEditorProps {
  chatbotId: string;
  onSave?: () => void;
}

export function ChatbotEditor({ chatbotId, onSave }: ChatbotEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);
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
    widget_form_buttons: [] as any[],
    widget_form_buttons_layout: 'vertical',
    hide_branding: false
  });

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
      });

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

    if (field === 'welcome_message' && value) {
      setPreviewMessages([{
        role: 'assistant',
        content: value,
        timestamp: new Date()
      }]);
    }
  };

  const handleWidgetInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    handleInputChange(name, value);
  };

  const handleCrawlComplete = () => {
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

      onSave?.();
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
      const messages = [
        { role: 'system', content: formData.system_prompt },
        ...previewMessages.filter((m: any) => m.role !== 'system').map((m: any) => ({ 
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
          messages: messages.slice(1),
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

  const handlePreviewKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendPreviewMessage();
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading chatbot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="ai">AI Config</TabsTrigger>
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="actions">Actions & FAQs</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="basic" className="space-y-4">
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

                <WebsiteCrawler
                  chatbotId={chatbot?.id}
                  websiteUrl={formData.website_url}
                  websiteContent={chatbot?.website_content}
                  crawlStatus={chatbot?.crawl_status}
                  lastCrawledAt={chatbot?.last_crawled_at}
                  onWebsiteUpdate={(url) => handleInputChange('website_url', url)}
                  onCrawlComplete={handleCrawlComplete}
                />

                <div className="flex items-center justify-between pt-4 border-t">
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
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
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
                      rows={6}
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
                </div>

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

                <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Usage Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="daily_token_limit">Daily Token Limit</Label>
                      <Input
                        id="daily_token_limit"
                        type="number"
                        value={formData.daily_token_limit}
                        onChange={(e) => handleInputChange('daily_token_limit', parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthly_token_limit">Monthly Token Limit</Label>
                      <Input
                        id="monthly_token_limit"
                        type="number"
                        value={formData.monthly_token_limit}
                        onChange={(e) => handleInputChange('monthly_token_limit', parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
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
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="widget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how your chatbot looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gradient Start</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formData.theme_gradient_start}
                            onChange={(e) => handleInputChange('theme_gradient_start', e.target.value)}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={formData.theme_gradient_start}
                            onChange={(e) => handleInputChange('theme_gradient_start', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Gradient End</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={formData.theme_gradient_end}
                            onChange={(e) => handleInputChange('theme_gradient_end', e.target.value)}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={formData.theme_gradient_end}
                            onChange={(e) => handleInputChange('theme_gradient_end', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg" style={{
                      background: `linear-gradient(${formData.theme_gradient_angle}deg, ${formData.theme_gradient_start}, ${formData.theme_gradient_end})`
                    }}>
                      <p className="text-white text-sm font-medium text-center">Preview</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Theme Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.theme_color}
                        onChange={(e) => handleInputChange('theme_color', e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={formData.theme_color}
                        onChange={(e) => handleInputChange('theme_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <WidgetCustomization
              formData={formData}
              onChange={handleWidgetInputChange}
              availableForms={availableForms}
            />
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <ChatbotActions chatbotId={chatbotId} />
            <ChatbotFAQs chatbotId={chatbotId} />
            <Card>
              <CardHeader>
                <CardTitle>Connected Forms</CardTitle>
                <CardDescription>
                  Manage which forms are active for this chatbot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormSelector chatbotId={chatbotId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
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
                      Receive email notifications when conversations end
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
                  </div>
                )}
              </CardContent>
            </Card>

            {formData.end_chat_notification_enabled && (
              <>
                <CustomParameterManager chatbotId={chatbotId} />
                <EmailTemplateEditor
                  chatbotId={chatbotId}
                  template={formData.email_template}
                  conditions={formData.email_conditions}
                  notificationEmail={formData.end_chat_notification_email}
                  onTemplateChange={(template) => handleInputChange('email_template', template)}
                  onConditionsChange={(conditions) => handleInputChange('email_conditions', conditions)}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                  <CardDescription>
                    Test your chatbot configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
                    
                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto mb-3">
                      {previewMessages.map((message: any, index: number) => (
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
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
                        type="button"
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Widget Preview</CardTitle>
                  <CardDescription>
                    How the chat widget appears on your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative border rounded-lg bg-gradient-to-br from-muted/50 to-muted h-48 overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-full" />
                      <div className="h-3 bg-muted-foreground/10 rounded w-5/6" />
                    </div>
                    
                    <div 
                      className={`absolute flex items-center justify-center shadow-lg cursor-pointer ${
                        formData.widget_position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                        formData.widget_position === 'top-left' ? 'top-4 left-4' :
                        formData.widget_position === 'top-right' ? 'top-4 right-4' :
                        formData.widget_position === 'bottom-left' ? 'bottom-4 left-4' :
                        'bottom-4 right-4'
                      } ${
                        formData.widget_size === 'small' ? 'w-12 h-12' :
                        formData.widget_size === 'large' ? 'w-20 h-20' :
                        'w-16 h-16'
                      }`}
                      style={{ 
                        backgroundColor: formData.widget_button_color,
                        color: formData.widget_text_color,
                        borderRadius: formData.widget_border_radius
                      }}
                    >
                      <MessageCircle className={`${
                        formData.widget_size === 'small' ? 'h-4 w-4' :
                        formData.widget_size === 'large' ? 'h-8 w-8' :
                        'h-6 w-6'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Save Button - Always visible */}
          <div className="flex gap-3 pt-4 border-t mt-6">
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
              Open Preview
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
