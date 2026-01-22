import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Bot, Sparkles, Save, Eye } from 'lucide-react';

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)' },
  { value: 'gpt-4o', label: 'GPT-4o (Most Powerful)' },
];

const THEME_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
];

export default function CreateChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tempChatbotId, setTempChatbotId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: 'You are a helpful assistant that answers questions about our company and helps customers with their inquiries. Be friendly, professional, and concise in your responses.',
    model: 'gpt-4o-mini',
    temperature: [0.7],
    max_tokens: 1000,
    is_active: true,
    website_url: '',
    theme_color: '#3b82f6',
    session_timeout_minutes: 30,
    end_chat_notification_enabled: false,
    end_chat_notification_email: '',
  });

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate embed codes - using FastAPI backend
      const tempId = crypto.randomUUID();
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://voxtro-backend.onrender.com';
      const embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${apiBaseUrl}/api/widget/${tempId}.js?v=' + Date.now();
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

      const inlineEmbedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${apiBaseUrl}/api/inline-chat/${tempId}.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

      const { data, error } = await supabase
        .from('chatbots')
        .insert([{
          ...formData,
          temperature: formData.temperature[0],
          embed_code: embedCode,
          inline_embed_code: inlineEmbedCode,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update embed codes with actual ID
      if (data) {
        const finalEmbedCode = embedCode.replace(tempId, data.id);
        const finalInlineEmbedCode = inlineEmbedCode.replace(tempId, data.id);
        await supabase
          .from('chatbots')
          .update({ 
            embed_code: finalEmbedCode,
            inline_embed_code: finalInlineEmbedCode
          })
          .eq('id', data.id);
          
        // Set the temp chatbot ID for crawling
        setTempChatbotId(data.id);
      }

      toast({
        title: 'Success!',
        description: 'Your chatbot has been created successfully.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create chatbot',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    toast({
      title: 'Preview Coming Soon',
      description: 'Chatbot preview functionality will be available soon!',
    });
  };

  const handleCrawlComplete = () => {
    toast({
      title: 'Website Crawled',
      description: 'Your website content has been processed and will be available to your chatbot.',
    });
  };

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
            <h1 className="text-xl font-semibold">Create New Chatbot</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Form Section */}
            <div className="lg:col-span-2">
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
                    {tempChatbotId && (
                      <WebsiteCrawler
                        chatbotId={tempChatbotId}
                        websiteUrl={formData.website_url}
                        onWebsiteUpdate={(url) => handleInputChange('website_url', url)}
                        onCrawlComplete={handleCrawlComplete}
                      />
                    )}
                  </CardContent>
                </Card>

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
                      <Textarea
                        id="system_prompt"
                        value={formData.system_prompt}
                        onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                        placeholder="Define how your chatbot should behave..."
                        rows={4}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        This instruction tells the AI how to behave and what its role is.
                      </p>
                    </div>

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

                {/* Appearance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                      Customize how your chatbot looks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {THEME_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              formData.theme_color === color
                                ? 'border-foreground scale-110'
                                : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleInputChange('theme_color', color)}
                          />
                        ))}
                      </div>
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

                {/* Actions */}
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Chatbot'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePreview}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Live Preview</CardTitle>
                    <CardDescription>
                      See how your chatbot will appear
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Chatbot Preview Widget */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: formData.theme_color }}
                        />
                        <span className="font-medium text-sm">
                          {formData.name || 'Your Chatbot'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="bg-background p-2 rounded border">
                          <p className="text-muted-foreground text-xs mb-1">User:</p>
                          <p>Hello! Can you help me?</p>
                        </div>
                        
                        <div 
                          className="p-2 rounded text-white"
                          style={{ backgroundColor: formData.theme_color }}
                        >
                          <p className="text-xs mb-1 opacity-80">
                            {formData.name || 'Bot'}:
                          </p>
                          <p>
                            Hello! I'd be happy to help you. What can I assist you with today?
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <Input 
                          placeholder="Type your message..." 
                          className="flex-1 text-sm"
                          disabled
                        />
                        <Button 
                          size="sm" 
                          style={{ backgroundColor: formData.theme_color }}
                          disabled
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Model:</span>
                        <span>{formData.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Creativity:</span>
                        <span>{formData.temperature[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={formData.is_active ? 'text-green-600' : 'text-red-600'}>
                          {formData.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Session Timeout:</span>
                        <span>{formData.session_timeout_minutes} min</span>
                      </div>
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