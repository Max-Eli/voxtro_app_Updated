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
import { Loader2, Plus, Trash2, Clock, CheckCircle, XCircle, Phone, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerPermissions } from '@/hooks/useCustomerPermissions';
import {
  submitFAQ,
  getMySubmittedContent,
  deleteSubmittedContent,
  ContributedContent,
  AgentPermissions,
} from '@/integrations/api/endpoints/permissions';

export function FAQSubmissionForm() {
  const { permissions, loading: permissionsLoading } = useCustomerPermissions();
  const [content, setContent] = useState<ContributedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  // Get voice assistants the customer can contribute FAQs to
  const allowedAssistants = permissions
    .filter(
      (p) =>
        p.agent_type === 'voice' &&
        p.permissions.some((perm) => perm.id === 'contribute_faq' && perm.is_enabled)
    )
    .map((p) => ({
      id: p.agent_id,
      name: p.agent_name,
    }));

  // Debug logging
  console.log('[FAQSubmissionForm] Permissions received:', permissions);
  console.log('[FAQSubmissionForm] Voice permissions:', permissions.filter(p => p.agent_type === 'voice'));
  console.log('[FAQSubmissionForm] Allowed assistants:', allowedAssistants);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await getMySubmittedContent();
      setContent(response.content || []);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAssistant || !question.trim() || !answer.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await submitFAQ({
        assistant_id: selectedAssistant,
        question: question.trim(),
        answer: answer.trim(),
      });

      toast.success('FAQ submitted for review');
      setQuestion('');
      setAnswer('');
      setSelectedAssistant('');
      setShowForm(false);
      fetchContent();
    } catch (error) {
      console.error('Failed to submit FAQ:', error);
      toast.error('Failed to submit FAQ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    try {
      await deleteSubmittedContent(contentId);
      toast.success('FAQ deleted');
      fetchContent();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      toast.error('Failed to delete FAQ');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
      case 'applied':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
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
      case 'applied':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Applied</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    return null; // Don't show anything if no FAQ permission
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              FAQ Contributions
            </CardTitle>
            <CardDescription>
              Submit FAQs to help improve your voice assistant&apos;s responses
            </CardDescription>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New FAQ Form */}
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
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="What question should the assistant be able to answer?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="What should the assistant say in response?"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setQuestion('');
                  setAnswer('');
                  setSelectedAssistant('');
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

        {/* Submitted FAQs */}
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No FAQs submitted yet</p>
            <p className="text-sm">Submit FAQs to help improve the assistant&apos;s knowledge</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {content.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <div className="rounded-lg bg-muted p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Question</p>
                        <p>{item.title}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Answer</p>
                        <p>{item.content}</p>
                      </div>
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
