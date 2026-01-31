import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Check, X, Globe, Phone, User, ExternalLink, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingCrawlUrls,
  reviewCrawlUrl,
  CrawlUrl,
} from '@/integrations/api/endpoints/permissions';

export function PendingCrawlUrlReview() {
  const [crawlUrls, setCrawlUrls] = useState<CrawlUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<CrawlUrl | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingUrls();
  }, []);

  const fetchPendingUrls = async () => {
    try {
      setLoading(true);
      console.log('[PendingCrawlUrlReview] Fetching pending crawl URLs');
      const response = await getPendingCrawlUrls();
      console.log('[PendingCrawlUrlReview] API response:', response);
      setCrawlUrls(response.crawl_urls || []);
    } catch (error) {
      console.error('[PendingCrawlUrlReview] Failed to fetch pending crawl URLs:', error);
      toast.error('Failed to load pending crawl URLs');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (item: CrawlUrl) => {
    setSelectedUrl(item);
    setReviewNotes('');
    setShowReviewDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedUrl) return;

    setSubmitting(true);
    try {
      const response = await reviewCrawlUrl(selectedUrl.id, 'approve', reviewNotes);
      toast.success(response.message || 'URL approved and set to active');
      setShowReviewDialog(false);
      fetchPendingUrls();
    } catch (error) {
      console.error('Failed to approve crawl URL:', error);
      toast.error('Failed to approve URL');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUrl) return;

    setSubmitting(true);
    try {
      await reviewCrawlUrl(selectedUrl.id, 'reject', reviewNotes);
      toast.success('URL rejected');
      setShowReviewDialog(false);
      fetchPendingUrls();
    } catch (error) {
      console.error('Failed to reject crawl URL:', error);
      toast.error('Failed to reject URL');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (crawlUrls.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium">No pending crawl URLs</h3>
            <p className="text-sm text-muted-foreground">
              Customer-submitted website URLs for crawling will appear here for review.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Pending Crawl URLs</h3>
            <p className="text-sm text-muted-foreground">
              Review and approve customer-submitted website URLs for crawling
            </p>
          </div>
          <Badge variant="secondary">{crawlUrls.length} pending</Badge>
        </div>

        <div className="space-y-3">
          {crawlUrls.map((item) => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium text-sm">{item.assistant_name}</span>
                      {getFrequencyBadge(item.crawl_frequency)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {item.url}
                        </a>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>
                        {item.customers?.full_name || item.customers?.email || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button size="sm" onClick={() => handleReview(item)}>
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Review Crawl URL
            </DialogTitle>
            <DialogDescription>
              Review this URL submission from {selectedUrl?.customers?.full_name || 'a customer'}
            </DialogDescription>
          </DialogHeader>

          {selectedUrl && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <Badge variant="outline">{selectedUrl.assistant_name}</Badge>
                  {getFrequencyBadge(selectedUrl.crawl_frequency)}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Website URL</p>
                    <a
                      href={selectedUrl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all flex items-center gap-2"
                    >
                      {selectedUrl.url}
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    </a>
                  </div>
                  {selectedUrl.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p>{selectedUrl.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Crawl Frequency</p>
                    <p className="capitalize">{selectedUrl.crawl_frequency}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes (optional)</label>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <strong>Note:</strong> Approving this URL will set it to active status. The URL will
                be crawled according to its frequency schedule and the content will be sent to the
                voice assistant.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve & Activate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
