import { CustomerForms } from '@/components/CustomerForms';
import { FileText } from 'lucide-react';

export function CustomerFormsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Forms & Submissions
        </h1>
        <p className="text-muted-foreground">
          View and manage form submissions from your chatbots
        </p>
      </div>
      
      <CustomerForms />
    </div>
  );
}