import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Entity {
  id: string;
  name: string;
}

interface AddChangelogEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'chatbot' | 'voice_assistant';
  entities: Entity[];
  onEntryAdded: () => void;
  preSelectedEntityId?: string | null;
}

export function AddChangelogEntry({ open, onOpenChange, entityType, entities, onEntryAdded, preSelectedEntityId }: AddChangelogEntryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    entity_id: '',
    change_type: 'note' as 'note' | 'update',
    title: '',
    description: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
  });

  // Pre-select entity when dialog opens with a pre-selected ID
  useEffect(() => {
    if (open && preSelectedEntityId) {
      setFormData(prev => ({ ...prev, entity_id: preSelectedEntityId }));
    }
  }, [open, preSelectedEntityId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({ entity_id: '', change_type: 'note', title: '', description: '', status: 'pending' });
    }
  }, [open]);

  const selectedEntity = entities.find(e => e.id === formData.entity_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.entity_id || !formData.title) return;

    setLoading(true);
    const { error } = await supabase.from('changelog_entries').insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: formData.entity_id,
      change_type: formData.change_type,
      title: formData.title,
      description: formData.description || null,
      status: formData.change_type === 'update' ? formData.status : null,
      source: 'manual',
    });

    if (error) {
      toast({ title: "Failed to add entry", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry added successfully" });
      onOpenChange(false);
      onEntryAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Changelog Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show entity name if pre-selected, otherwise show dropdown */}
          {preSelectedEntityId && selectedEntity ? (
            <div className="space-y-2">
              <Label>{entityType === 'chatbot' ? 'Chatbot' : 'Voice Assistant'}</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                {selectedEntity.name}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{entityType === 'chatbot' ? 'Chatbot' : 'Voice Assistant'}</Label>
              <Select value={formData.entity_id} onValueChange={(v) => setFormData(p => ({ ...p, entity_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Entry Type</Label>
            <Select value={formData.change_type} onValueChange={(v: any) => setFormData(p => ({ ...p, change_type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="Brief title for this entry"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Add more details..."
              rows={4}
            />
          </div>

          {formData.change_type === 'update' && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.entity_id || !formData.title}>
              {loading ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
