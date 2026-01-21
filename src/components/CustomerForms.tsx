import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Eye, Calendar, User, Building } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerForm {
  id: string;
  form_name: string;
  form_title: string;
  form_description?: string;
  fields: any;
  chatbot_name: string;
  submission_count: number;
  terms_and_conditions?: string;
  require_terms_acceptance: boolean;
}

interface FormSubmission {
  id: string;
  submitted_data: any;
  submitted_at: string;
  visitor_id?: string;
  status: string;
  form_id: string;
}

export function CustomerForms() {
  const { customer } = useCustomerAuth();
  const [forms, setForms] = useState<CustomerForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<CustomerForm | null>(null);

  useEffect(() => {
    if (customer) {
      fetchCustomerForms();
    }
  }, [customer]);

  const fetchCustomerForms = async () => {
    if (!customer) return;

    try {
      console.log("Fetching customer forms for customer:", customer.id);
      
      // Get forms for assigned chatbots
      const { data: formsData, error: formsError } = await supabase
        .from('chatbot_forms')
        .select(`
          id,
          form_name,
          form_title,
          form_description,
          fields,
          terms_and_conditions,
          require_terms_acceptance,
          chatbots!inner (
            id,
            name,
            customer_chatbot_assignments!inner (
              customer_id
            )
          )
        `)
        .eq('chatbots.customer_chatbot_assignments.customer_id', customer.id)
        .eq('is_active', true);

      console.log("Forms data:", formsData, formsError);
      
      if (formsError) throw formsError;

      // Get submission counts for each form
      const formsWithCounts = await Promise.all(
        (formsData || []).map(async (form) => {
          const { count } = await supabase
            .from('form_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);

          return {
            id: form.id,
            form_name: form.form_name,
            form_title: form.form_title,
            form_description: form.form_description,
            fields: form.fields as any,
            terms_and_conditions: form.terms_and_conditions,
            require_terms_acceptance: form.require_terms_acceptance || false,
            chatbot_name: (form.chatbots as any).name,
            submission_count: count || 0,
          };
        })
      );

      setForms(formsWithCounts);
    } catch (error) {
      console.error('Error fetching customer forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormSubmissions = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching form submissions:', error);
    }
  };

  const handleViewSubmissions = (form: CustomerForm) => {
    setSelectedForm(form);
    fetchFormSubmissions(form.id);
  };

  const getFieldLabel = (fieldId: string, form: CustomerForm) => {
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const field = fields.find(f => f.id === fieldId);
    return field?.label || fieldId;
  };

  const formatFieldValue = (field: any, value: any) => {
    if (!value) return 'N/A';
    
    if (field?.type === 'checkbox' && Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (field?.type === 'radio' || field?.type === 'select') {
      return value.toString();
    }
    
    return value.toString();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading forms...</p>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Forms Found</h3>
        <p className="text-muted-foreground">
          No forms have been created for your assigned chatbots yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Forms & Submissions</h2>
          <p className="text-muted-foreground">
            View forms from your assigned chatbots and their submissions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form) => (
          <Card key={form.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{form.form_title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    From: {form.chatbot_name}
                  </p>
                </div>
                <Badge variant="secondary">
                  {form.submission_count} submissions
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {form.form_description || 'No description provided'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{Array.isArray(form.fields) ? form.fields.length : 0} fields</span>
                  </div>
                  {form.require_terms_acceptance && (
                    <Badge variant="secondary" className="text-xs">
                      Terms Required
                    </Badge>
                  )}
                </div>
                
                {form.require_terms_acceptance && form.terms_and_conditions && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <strong>Terms:</strong> {form.terms_and_conditions.slice(0, 100)}
                    {form.terms_and_conditions.length > 100 && '...'}
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleViewSubmissions(form)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Submissions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {form.form_title} - Submissions
                      </DialogTitle>
                    </DialogHeader>

                    {submissions.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No submissions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          Total submissions: {submissions.length}
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Submitted At</TableHead>
                              <TableHead>Visitor ID</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {submissions.map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {format(new Date(submission.submitted_at), 'MMM dd, yyyy HH:mm')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {submission.visitor_id?.slice(0, 8) || 'Anonymous'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={submission.status === 'submitted' ? 'default' : 'secondary'}>
                                    {submission.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1 max-w-md">
                                    {submission.submitted_data && typeof submission.submitted_data === 'object' && 
                                     Object.entries(submission.submitted_data as Record<string, any>).map(([fieldId, value]) => (
                                      <div key={fieldId} className="text-sm">
                                        <span className="font-medium">
                                          {selectedForm ? getFieldLabel(fieldId, selectedForm) : fieldId}:
                                        </span>
                                        <span className="ml-2 text-muted-foreground">
                                          {formatFieldValue(null, value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}