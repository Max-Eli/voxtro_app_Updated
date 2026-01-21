import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangelogEntryCard } from "./ChangelogEntryCard";

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

interface Entity {
  id: string;
  name: string;
}

interface ChangelogTimelineProps {
  entries: ChangelogEntry[];
  loading: boolean;
  entities: Entity[];
  onStatusChange: (entryId: string, newStatus: string) => void;
  onDelete: (entryId: string) => void;
}

export function ChangelogTimeline({ entries, loading, entities, onStatusChange, onDelete }: ChangelogTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No changelog entries found.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add notes, track changes, or create tasks to get started.
        </p>
      </Card>
    );
  }

  const getEntityName = (entityId: string) => {
    const entity = entities.find(e => e.id === entityId);
    return entity?.name || 'Unknown';
  };

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <ChangelogEntryCard
          key={entry.id}
          entry={entry}
          entityName={getEntityName(entry.entity_id)}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
