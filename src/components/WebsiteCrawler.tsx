import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Globe, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { crawlWebsite } from '@/integrations/api/endpoints/chat';

interface WebsiteCrawlerProps {
  chatbotId?: string;
  websiteUrl?: string;
  websiteContent?: string;
  crawlStatus?: string;
  lastCrawledAt?: string;
  onWebsiteUpdate?: (url: string) => void;
  onCrawlComplete?: () => void;
}

export function WebsiteCrawler({
  chatbotId,
  websiteUrl = '',
  websiteContent,
  crawlStatus = 'pending',
  lastCrawledAt,
  onWebsiteUpdate,
  onCrawlComplete,
}: WebsiteCrawlerProps) {
  const [url, setUrl] = useState(websiteUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const { toast } = useToast();

  const discoverPages = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    try {
      const data = await crawlWebsite({
        chatbot_id: chatbotId!,
        url: url,
        discover_only: true
      });

      if (data?.pages) {
        setDiscoveredPages(data.pages);
        setSelectedPages(data.pages.slice(0, 5)); // Select first 5 by default
        setShowPageSelector(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to discover pages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrawl = async () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a website URL',
        variant: 'destructive',
      });
      return;
    }

    if (!chatbotId) {
      toast({
        title: 'Error',
        description: 'No chatbot selected',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update the website URL first
      onWebsiteUpdate?.(url);

      const data = await crawlWebsite({
        chatbot_id: chatbotId,
        url: url,
        selected_pages: selectedPages.length > 0 ? selectedPages : undefined
      });

      toast({
        title: 'Success',
          description: error.message || 'Failed to crawl website',
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        toast({
          title: 'Success',
          description: `Website crawled successfully! ${data.pagesCount} pages processed.`,
        });
        onCrawlComplete?.();
      } else {
        toast({
          title: 'Error',
          description: data?.error || 'Failed to crawl website',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Crawl error:', error);
      toast({
        title: 'Error',
        description: 'Failed to crawl website',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (crawlStatus) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'crawling':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Crawling...</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Website Content
        </CardTitle>
        <CardDescription>
          Crawl your website to provide context to your chatbot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={discoverPages}
            disabled={isLoading || !url.trim()}
            variant="outline"
            className="min-w-[100px]"
          >
            Discover Pages
          </Button>
          <Button
            onClick={handleCrawl}
            disabled={isLoading || !url.trim() || (showPageSelector && selectedPages.length === 0)}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {websiteContent ? 'Re-crawl' : 'Crawl'}
              </>
            )}
          </Button>
        </div>

        {showPageSelector && discoveredPages.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-semibold mb-2">Select Pages to Crawl ({selectedPages.length} selected)</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {discoveredPages.map((page, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`page-${index}`}
                    checked={selectedPages.includes(page)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPages([...selectedPages, page]);
                      } else {
                        setSelectedPages(selectedPages.filter(p => p !== page));
                      }
                    }}
                  />
                  <label htmlFor={`page-${index}`} className="text-sm cursor-pointer flex-1 truncate">
                    {page}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {url && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge()}
            </div>
            {lastCrawledAt && (
              <span className="text-sm text-muted-foreground">
                Last crawled: {new Date(lastCrawledAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}