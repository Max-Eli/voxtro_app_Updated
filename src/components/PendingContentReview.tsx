import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, Check, X, FileQuestion, Phone, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPendingContent,
  reviewContent,
  ContributedContent,
} from '@/integrations/api/endpoints/permissions';

interface PendingContentReviewProps {
  agentType?: 'voice' | 'chatbot';
}

export function PendingContentReview({ agentType }: PendingContentReviewProps) {
  const [content, setContent] = useState<ContributedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContributedContent | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingContent();
  }, [agentType]);

  const fetchPendingContent = async () => {
    try {
      setLoading(true);
      const response = await getPendingContent(agentType);
      setContent(response.content || []);
    } catch (error) {
      console.error('Failed to fetch pending content:', error);
      toast.error('Failed to load pending content');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (item: ContributedContent) => {
    setSelectedContent(item);
    setReviewNotes('');
    setShowReviewDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedContent) return;

    setSubmitting(true);
    try {
      const response = await reviewContent(selectedContent.id, 'approve', reviewNotes);
      toast.success(response.message || 'Content approved and applied');
      setShowReviewDialog(false);
      fetchPendingContent();
    } catch (error) {
      console.error('Failed to approve content:', error);
      toast.error('Failed to approve content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedContent) return;

    setSubmitting(true);
    try {
      await reviewContent(selectedContent.id, 'reject', reviewNotes);
      toast.success('Content rejected');
      setShowReviewDialog(false);
      fetchPendingContent();
    } catch (error) {
      console.error('Failed to reject content:', error);
      toast.error('Failed to reject content');
    } finally {
      setSubmitting(false);
    }
  };

  const getAgentIcon = (type?: string) => {
    switch (type) {
      case 'voice':
        return <Phone className="h-4 w-4" />;
      case 'chatbot':
        return <Bot className="h-4 w-4" />;
      default:
        return <FileQuestion className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium">No pending content</h3>
            <p className="text-sm text-muted-foreground">
              Customer-submitted FAQs and content will appear here for review.
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
            <h3 className="text-lg font-semibold">Pending Content</h3>
            <p className="text-sm text-muted-foreground">
              Review and approve customer-submitted FAQs
            </p>
          </div>
          <Badge variant="secondary">{content.length} pending</Badge>
        </div>

        <div className="space-y-3">
          {content.map((item) => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {getAgentIcon(item.agent_type)}
                      <span className="font-medium text-sm">{item.agent_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.content_type.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="font-medium">Q: {item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        A: {item.content}
                      </p>
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
              {getAgentIcon(selectedContent?.agent_type)}
              Review Customer FAQ
            </DialogTitle>
            <DialogDescription>
              Review this FAQ submission from {selectedContent?.customers?.full_name || 'a customer'}
            </DialogDescription>
          </DialogHeader>

          {selectedContent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedContent.agent_name}</Badge>
                  <Badge variant="secondary">{selectedContent.content_type}</Badge>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Question</p>
                    <p className="font-medium">{selectedContent.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Answer</p>
                    <p>{selectedContent.content}</p>
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

              {selectedContent.agent_type === 'voice' && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  <strong>Note:</strong> Approving this FAQ will automatically add it to the
                  voice assistant&apos;s system prompt in VAPI.
                </div>
              )}
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
                  Approve & Apply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
