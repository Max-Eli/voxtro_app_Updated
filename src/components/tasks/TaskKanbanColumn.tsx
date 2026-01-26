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
        "flex flex-col rounded-lg border-2 border-dashed transition-all h-full",
        color,
        isOver && "ring-2 ring-primary ring-offset-2 scale-[1.02]",
        isDragging && "bg-muted/50"
      )}
    >
      {/* Sticky header */}
      <div className={cn(
        "p-3 border-b rounded-t-lg flex-shrink-0",
        color.replace('border-', 'bg-').replace('/20', '/30')
      )}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden min-h-0">
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
