import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy,
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

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced distance for quicker activation
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // Short delay for touch devices
        tolerance: 5,
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
      // Add haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setIsDragging(false);

    if (!over) return;

    const taskId = active.id as string;
    let newStatus = over.id as string;

    // Check if dropped on a task card - get its column
    const droppedOnTask = tasks.find((t) => t.id === over.id);
    if (droppedOnTask) {
      newStatus = droppedOnTask.status;
    }

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
        toast.success(`Moved to ${COLUMNS.find(c => c.id === newStatus)?.title}`);
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
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      {/* Full height container - columns scroll independently */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
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

      {/* Drag overlay - shows the card being dragged */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
          <div className="rotate-3 scale-105 shadow-2xl">
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
