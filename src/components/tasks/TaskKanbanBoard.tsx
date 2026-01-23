import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task } from "@/pages/VoiceAssistantTasks";
import { TaskKanbanCard } from "./TaskKanbanCard";
import { TaskKanbanColumn } from "./TaskKanbanColumn";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskKanbanBoardProps {
  tasks: Task[];
  getAssistantName: (assistantId: string) => string;
  getOrgName: (orgId: string | null) => string;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const COLUMNS = [
  { id: "pending", title: "Pending", color: "bg-yellow-500/10 border-yellow-500/20" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500/10 border-blue-500/20" },
  { id: "completed", title: "Completed", color: "bg-green-500/10 border-green-500/20" },
  { id: "cancelled", title: "Cancelled", color: "bg-gray-500/10 border-gray-500/20" },
];

export function TaskKanbanBoard({
  tasks,
  getAssistantName,
  getOrgName,
  onTaskUpdated,
  onTaskDeleted,
}: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByStatus = COLUMNS.reduce((acc, column) => {
    acc[column.id] = tasks.filter((task) => task.status === column.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      setIsDragging(true);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setIsDragging(false);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Check if it's a valid column
    if (!COLUMNS.find((col) => col.id === newStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistically update UI
    const updatedTask = { ...task, status: newStatus };
    onTaskUpdated(updatedTask);

    // Update in database
    try {
      const { error } = await supabase
        .from("voice_assistant_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) {
        toast.error("Failed to update task status");
        // Revert on error
        onTaskUpdated(task);
      } else {
        toast.success("Task status updated");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task status");
      onTaskUpdated(task);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((column) => (
          <TaskKanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            count={tasksByStatus[column.id]?.length || 0}
            isDragging={isDragging}
          >
            <SortableContext
              items={tasksByStatus[column.id]?.map((t) => t.id) || []}
              strategy={verticalListSortingStrategy}
            >
              {tasksByStatus[column.id]?.map((task) => (
                <TaskKanbanCard
                  key={task.id}
                  task={task}
                  assistantName={getAssistantName(task.assistant_id)}
                  orgName={getOrgName(task.org_id)}
                  onUpdate={onTaskUpdated}
                  onDelete={onTaskDeleted}
                />
              ))}
            </SortableContext>
          </TaskKanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-50">
            <TaskKanbanCard
              task={activeTask}
              assistantName={getAssistantName(activeTask.assistant_id)}
              orgName={getOrgName(activeTask.org_id)}
              onUpdate={onTaskUpdated}
              onDelete={onTaskDeleted}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
