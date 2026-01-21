import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  PlayCircle,
  ChevronDown,
  MoreVertical,
  MessageSquare,
  Zap,
  Send
} from "lucide-react";

interface ChangelogEntry {
  id: string;
  user_id: string;
  entity_type: 'chatbot' | 'voice_assistant';
  entity_id: string;
  change_type: 'update' | 'create' | 'delete' | 'note' | 'task';
  title: string;
  description: string | null;
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | null;
  source: 'manual' | 'auto' | 'vapi_sync';
  created_at: string;
  updated_at: string;
}

interface ChangelogNote {
  id: string;
  note: string;
  created_at: string;
}

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  entityName: string;
  onStatusChange: (entryId: string, newStatus: string) => void;
  onDelete: (entryId: string) => void;
}

export function ChangelogEntryCard({ entry, entityName, onStatusChange, onDelete }: ChangelogEntryCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<ChangelogNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const changeTypeConfig = {
    update: { icon: RefreshCw, color: 'bg-blue-500/10 text-blue-500' },
    create: { icon: Plus, color: 'bg-green-500/10 text-green-500' },
    delete: { icon: Trash2, color: 'bg-red-500/10 text-red-500' },
    note: { icon: FileText, color: 'bg-yellow-500/10 text-yellow-500' },
    task: { icon: CheckCircle2, color: 'bg-purple-500/10 text-purple-500' },
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    in_progress: { icon: PlayCircle, color: 'text-blue-500', label: 'In Progress' },
    completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  };

  const config = changeTypeConfig[entry.change_type];
  const Icon = config.icon;

  const fetchNotes = async () => {
    if (loadingNotes || notes.length > 0) return;
    setLoadingNotes(true);
    const { data } = await supabase
      .from('changelog_notes')
      .select('*')
      .eq('changelog_entry_id', entry.id)
      .order('created_at', { ascending: true });
    setNotes((data || []) as ChangelogNote[]);
    setLoadingNotes(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setAddingNote(true);
    const { data, error } = await supabase
      .from('changelog_notes')
      .insert({
        changelog_entry_id: entry.id,
        user_id: user.id,
        note: newNote.trim()
      })
      .select()
      .single();
    
    if (error) {
      toast({ title: "Failed to add note", variant: "destructive" });
    } else {
      setNotes(prev => [...prev, data as ChangelogNote]);
      setNewNote('');
      toast({ title: "Note added" });
    }
    setAddingNote(false);
  };

  const hasChanges = Object.keys(entry.previous_values || {}).length > 0 || Object.keys(entry.new_values || {}).length > 0;

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'vapi_sync': return 'Vapi';
      case 'auto': return 'Auto';
      default: return 'Manual';
    }
  };

  return (
    <Card className="p-4">
      <Collapsible open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) fetchNotes(); }}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg shrink-0 ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm leading-tight">{entry.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(entry.created_at), 'MMM d, yyyy • h:mm a')}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{entityName}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {getSourceLabel(entry.source)}
                  </Badge>
                  {entry.status && entry.source === 'manual' && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConfig[entry.status].color}`}>
                      {statusConfig[entry.status].label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(entry.change_type === 'task' || entry.change_type === 'update') && entry.source === 'manual' && (
                      <>
                        <DropdownMenuItem onClick={() => onStatusChange(entry.id, 'pending')}>
                          <Clock className="h-4 w-4 mr-2" /> Mark Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(entry.id, 'in_progress')}>
                          <PlayCircle className="h-4 w-4 mr-2" /> Mark In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(entry.id, 'completed')}>
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(entry.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <CollapsibleContent className="mt-4 ml-11 space-y-4">
          {/* Description */}
          {entry.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.description}</p>
          )}

          {/* Changes */}
          {hasChanges && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Changes</p>
              <div className="bg-muted/50 rounded-md p-3 space-y-1.5 text-xs font-mono">
                {Object.keys(entry.new_values || {}).map(key => (
                  <div key={key} className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">{key}:</span>
                    {entry.previous_values?.[key] !== undefined && (
                      <span className="text-red-400 line-through">
                        {JSON.stringify(entry.previous_values[key])}
                      </span>
                    )}
                    <span className="text-green-400">
                      {JSON.stringify(entry.new_values[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Notes ({notes.length})
            </p>
            
            {notes.map(note => (
              <div key={note.id} className="bg-muted/30 rounded-md p-3">
                <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(note.created_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
            ))}

            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
