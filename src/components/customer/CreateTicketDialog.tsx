import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Send } from 'lucide-react';
import { createCustomerPortalTicket } from '@/integrations/api/endpoints/customers';
import { usePersistedState } from '@/hooks/usePersistedState';

interface CreateTicketDialogProps {
  customerId: string;
  customerName: string;
  customerEmail: string;
  onTicketCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateTicketDialog({ 
  customerId, 
  customerName, 
  customerEmail, 
  onTicketCreated,
  trigger 
}: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  // Use persisted state to prevent data loss on tab switches
  const [subject, setSubject, clearSubject] = usePersistedState('createTicketDialog_subject', '');
  const [description, setDescription, clearDescription] = usePersistedState('createTicketDialog_description', '');
  const [priority, setPriority, clearPriority] = usePersistedState('createTicketDialog_priority', 'medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Call the customer portal API to create the ticket
      await createCustomerPortalTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority
      });

      toast.success('Support ticket created successfully');
      // Clear persisted state on successful submission
      clearSubject();
      clearDescription();
      clearPriority();
      setOpen(false);
      onTicketCreated?.();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and we'll get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
            <Input
              id="subject"
              placeholder="Brief summary of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea
              id="description"
              placeholder="Please describe your issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !subject.trim() || !description.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}