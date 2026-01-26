import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface TaskKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
  isDragging: boolean;
}

export function TaskKanbanColumn({
  id,
  title,
  color,
  count,
  children,
  isDragging,
}: TaskKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 border-dashed transition-all",
        color,
        isOver && "ring-2 ring-primary ring-offset-2 scale-[1.02]",
        isDragging && "bg-muted/50"
      )}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
    >
      {/* Sticky header */}
      <div className={cn(
        "p-3 border-b rounded-t-lg",
        color.replace('border-', 'bg-').replace('/20', '/30')
      )}
      style={{ flexShrink: 0 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>

      {/* Scrollable content area */}
      <div
        className="p-2 space-y-2"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
