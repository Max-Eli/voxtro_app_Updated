import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Eye, Download, User, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FormSubmission {
  id: string;
  form_id: string;
  conversation_id?: string;
  submitted_data: Record<string, any>;
  visitor_id?: string;
  submitted_at: string;
  status: string;
  chatbot_forms: {
    form_name: string;
    form_title: string;
    form_description?: string;
    fields: any[];
  };
}

interface FormSubmissionsProps {
  chatbotId: string;
}

export function FormSubmissions({ chatbotId }: FormSubmissionsProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  useEffect(() => {
    if (chatbotId) {
      fetchSubmissions();
    }
  }, [chatbotId]);

  const fetchSubmissions = async () => {
    try {
      // First get the form IDs for this chatbot
      const { data: forms, error: formsError } = await supabase
        .from('chatbot_forms')
        .select('id')
        .eq('chatbot_id', chatbotId);

      if (formsError || !forms || forms.length === 0) {
        setSubmissions([]);
        return;
      }

      const formIds = forms.map(f => f.id);
      
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          *,
          chatbot_forms(form_name, form_title, form_description, fields)
        `)
        .in('form_id', formIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data || []).map(submission => ({
        ...submission,
        submitted_data: typeof submission.submitted_data === 'object' 
          ? submission.submitted_data as Record<string, any>
          : {},
        chatbot_forms: (submission.chatbot_forms && typeof submission.chatbot_forms === 'object') 
          ? submission.chatbot_forms as any
          : { 
              form_name: 'Unknown Form', 
              form_title: 'Unknown Form', 
              fields: [] 
            }
      })));
    } catch (error) {
      console.error('Error fetching form submissions:', error);
      toast.error('Failed to load form submissions');
    } finally {
      setLoading(false);
    }
  };

  const exportSubmissions = () => {
    if (submissions.length === 0) return;

    const csvData = submissions.map(submission => {
      const row: Record<string, any> = {
        'Form Name': submission.chatbot_forms.form_name,
        'Submitted At': format(new Date(submission.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
        'Visitor ID': submission.visitor_id || 'Anonymous',
        'Status': submission.status
      };

      // Add form field data
      Object.entries(submission.submitted_data).forEach(([key, value]) => {
        row[key] = Array.isArray(value) ? value.join(', ') : value;
      });

      return row;
    });

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-submissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Form submissions exported successfully');
  };

  const formatFieldValue = (field: any, value: any) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (field.type === 'date' && value) {
      return format(new Date(value), 'PPP');
    }
    return value?.toString() || 'Not provided';
  };

  const getFieldLabel = (fieldId: string, fields: any[]) => {
    const field = fields.find(f => f.id === fieldId);
    return field?.label || fieldId;
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
          <h2 className="text-2xl font-bold text-foreground">Form Submissions</h2>
          <p className="text-muted-foreground">View and manage form submissions from your chatbot</p>
        </div>
        
        {submissions.length > 0 && (
          <Button onClick={exportSubmissions} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {submissions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No form submissions yet</h3>
            <p className="text-muted-foreground mb-4">
              Form submissions from your chatbot will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{submission.chatbot_forms.form_title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(submission.submitted_at), 'PPP p')}
                        </div>
                        {submission.visitor_id && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {submission.visitor_id}
                          </div>
                        )}
                        {submission.conversation_id && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            Conversation
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={submission.status === 'submitted' ? 'default' : 'secondary'}>
                      {submission.status}
                    </Badge>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          onClick={() => setSelectedSubmission(submission)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {submission.chatbot_forms.form_title}
                          </DialogTitle>
                        </DialogHeader>

                        <ScrollArea className="max-h-[60vh]">
                          <div className="space-y-6">
                            {/* Submission Info */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-foreground">Submission Details</h3>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Submitted:</span>
                                  <p className="font-medium">{format(new Date(submission.submitted_at), 'PPP p')}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <p className="font-medium capitalize">{submission.status}</p>
                                </div>
                                {submission.visitor_id && (
                                  <div>
                                    <span className="text-muted-foreground">Visitor ID:</span>
                                    <p className="font-medium font-mono text-xs">{submission.visitor_id}</p>
                                  </div>
                                )}
                                {submission.conversation_id && (
                                  <div>
                                    <span className="text-muted-foreground">Conversation:</span>
                                    <p className="font-medium font-mono text-xs">{submission.conversation_id}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Separator />

                            {/* Form Data */}
                            <div className="space-y-4">
                              <h3 className="font-semibold text-foreground">Form Responses</h3>
                              {Object.entries(submission.submitted_data).map(([fieldId, value]) => (
                                <div key={fieldId} className="space-y-1">
                                  <label className="text-sm font-medium text-muted-foreground">
                                    {getFieldLabel(fieldId, submission.chatbot_forms.fields)}
                                  </label>
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-foreground">
                                      {formatFieldValue(
                                        submission.chatbot_forms.fields.find(f => f.id === fieldId),
                                        value
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {submission.chatbot_forms.form_description || 'No description provided'}
                  </div>
                  
                  {/* Preview of submitted data */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(submission.submitted_data).slice(0, 3).map(([fieldId, value]) => (
                      <div key={fieldId} className="bg-muted/50 px-2 py-1 rounded text-xs">
                        <span className="font-medium">
                          {getFieldLabel(fieldId, submission.chatbot_forms.fields)}:
                        </span>
                        <span className="ml-1">
                          {Array.isArray(value) 
                            ? value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '')
                            : (value?.toString().slice(0, 30) || 'N/A') + (value?.toString().length > 30 ? '...' : '')
                          }
                        </span>
                      </div>
                    ))}
                    {Object.keys(submission.submitted_data).length > 3 && (
                      <div className="bg-muted/50 px-2 py-1 rounded text-xs text-muted-foreground">
                        +{Object.keys(submission.submitted_data).length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}