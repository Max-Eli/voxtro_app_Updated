import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Plus, Trash2, Clock, CheckCircle, XCircle, Phone, Globe, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerPermissions } from '@/hooks/useCustomerPermissions';
import {
  submitCrawlUrl,
  getMyCrawlUrls,
  deleteCrawlUrl,
  CrawlUrl,
} from '@/integrations/api/endpoints/permissions';

export function WebCrawlSubmissionForm() {
  const { permissions, loading: permissionsLoading } = useCustomerPermissions();
  const [crawlUrls, setCrawlUrls] = useState<CrawlUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Get voice assistants the customer can contribute crawl URLs to
  const allowedAssistants = permissions
    .filter(
      (p) =>
        p.agent_type === 'voice' &&
        p.permissions.some((perm) => perm.id === 'contribute_crawl_url' && perm.is_enabled)
    )
    .map((p) => ({
      id: p.agent_id,
      name: p.agent_name,
    }));

  // Debug logging
  console.log('[WebCrawlSubmissionForm] Permissions received:', permissions);
  console.log('[WebCrawlSubmissionForm] Allowed assistants for crawl URL:', allowedAssistants);

  useEffect(() => {
    fetchCrawlUrls();
  }, []);

  const fetchCrawlUrls = async () => {
    try {
      setLoading(true);
      const response = await getMyCrawlUrls();
      setCrawlUrls(response.crawl_urls || []);
    } catch (error) {
      console.error('Failed to fetch crawl URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssistant || !url.trim()) {
      toast.error('Please select an assistant and enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setSubmitting(true);
    try {
      await submitCrawlUrl({
        assistant_id: selectedAssistant,
        url: url.trim(),
        description: description.trim() || undefined,
        crawl_frequency: frequency,
      });

      toast.success('Website URL submitted for review');
      setUrl('');
      setDescription('');
      setSelectedAssistant('');
      setFrequency('daily');
      setShowForm(false);
      fetchCrawlUrls();
    } catch (error) {
      console.error('Failed to submit crawl URL:', error);
      toast.error('Failed to submit URL');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (crawlUrlId: string) => {
    try {
      await deleteCrawlUrl(crawlUrlId);
      toast.success('URL deleted');
      fetchCrawlUrls();
    } catch (error) {
      console.error('Failed to delete crawl URL:', error);
      toast.error('Failed to delete URL');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-orange-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Approved</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Paused</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFrequencyBadge = (freq: string) => {
    switch (freq) {
      case 'daily':
        return <Badge variant="secondary" className="text-xs">Daily</Badge>;
      case 'weekly':
        return <Badge variant="secondary" className="text-xs">Weekly</Badge>;
      case 'monthly':
        return <Badge variant="secondary" className="text-xs">Monthly</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{freq}</Badge>;
    }
  };

  const getCrawlStatusBadge = (status: string | null) => {
    if (!status) return null;
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">Last crawl: Success</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">Last crawl: Failed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">Crawl pending</Badge>;
      default:
        return null;
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allowedAssistants.length === 0) {
    return null; // Don't show anything if no crawl URL permission
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Crawl URLs
            </CardTitle>
            <CardDescription>
              Submit website URLs to be crawled regularly for your voice assistant&apos;s knowledge
            </CardDescription>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add URL
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Crawl URL Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="assistant">Voice Assistant</Label>
              <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
                <SelectTrigger id="assistant">
                  <SelectValue placeholder="Select an assistant" />
                </SelectTrigger>
                <SelectContent>
                  {allowedAssistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {assistant.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/page-to-crawl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL of the page you want crawled for knowledge
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Crawl Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily' | 'weekly' | 'monthly')}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief note about what this page contains..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setUrl('');
                  setDescription('');
                  setSelectedAssistant('');
                  setFrequency('daily');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Submitted Crawl URLs */}
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : crawlUrls.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No website URLs submitted yet</p>
            <p className="text-sm">Submit URLs to automatically crawl for assistant knowledge</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {crawlUrls.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left flex-1">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1 truncate">{item.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        {getFrequencyBadge(item.crawl_frequency)}
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div className="rounded-lg bg-muted p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">URL</p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {item.url}
                        </a>
                      </div>
                      {item.description && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Description</p>
                          <p>{item.description}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                          <p className="capitalize">{item.crawl_frequency}</p>
                        </div>
                        {item.crawl_count > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Times Crawled</p>
                            <p>{item.crawl_count}</p>
                          </div>
                        )}
                      </div>
                      {item.last_crawled_at && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Last crawled: {new Date(item.last_crawled_at).toLocaleString()}
                          </span>
                          {getCrawlStatusBadge(item.last_crawl_status)}
                        </div>
                      )}
                      {item.last_crawl_error && (
                        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
                          Error: {item.last_crawl_error}
                        </div>
                      )}
                    </div>

                    {item.review_notes && (
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-sm font-medium text-blue-800">Review Notes</p>
                        <p className="text-sm text-blue-700">{item.review_notes}</p>
                      </div>
                    )}

                    {item.status === 'pending' && (
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
