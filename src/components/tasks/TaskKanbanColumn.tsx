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

  // Completed column can hold more tasks with larger max-height
  const isCompletedColumn = id === "completed";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border-2 border-dashed transition-all",
        color,
        isOver && "ring-2 ring-primary ring-offset-2",
        isDragging && "bg-muted/50"
      )}
    >
      <div className="p-4 border-b sticky top-0 bg-inherit z-10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full">
            {count}
          </span>
        </div>
      </div>
      <div
        className={cn(
          "flex-1 p-2 space-y-2 overflow-y-auto",
          // Completed column has no max-height limit - can scroll infinitely
          isCompletedColumn ? "min-h-[200px]" : "min-h-[300px] max-h-[calc(100vh-300px)]"
        )}
        style={isCompletedColumn ? { maxHeight: 'none' } : undefined}
      >
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
