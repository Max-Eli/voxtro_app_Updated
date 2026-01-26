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

interface Assistant {
  id: string;
  name: string | null;
  org_id: string | null;
}

interface TeamMember {
  user_id: string;
  email?: string;
  user_name?: string;
}

interface Chatbot {
  id: string;
  name: string;
}

interface WhatsAppAgent {
  id: string;
  name: string | null;
  phone_number: string | null;
}

interface TaskKanbanBoardProps {
  tasks: Task[];
  getAssistantName: (assistantId: string | null) => string;
  getOrgName: (orgId: string | null) => string;
  getAssignedToName?: (userId: string | null) => string;
  getChatbotName?: (chatbotId: string | null) => string;
  getWhatsappAgentName?: (agentId: string | null) => string;
  getCreatedByName?: (userId: string | null) => string;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  assistants?: Assistant[];
  teamMembers?: TeamMember[];
  chatbots?: Chatbot[];
  whatsappAgents?: WhatsAppAgent[];
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
  getAssignedToName,
  getChatbotName,
  getWhatsappAgentName,
  getCreatedByName,
  onTaskUpdated,
  onTaskDeleted,
  assistants = [],
  teamMembers = [],
  chatbots = [],
  whatsappAgents = [],
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ flex: 1, minHeight: 0, height: '100%' }}
        >
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
                  assignedToName={getAssignedToName?.(task.assigned_to)}
                  chatbotName={getChatbotName?.(task.chatbot_id)}
                  whatsappAgentName={getWhatsappAgentName?.(task.whatsapp_agent_id)}
                  createdByName={getCreatedByName?.(task.user_id)}
                  onUpdate={onTaskUpdated}
                  onDelete={onTaskDeleted}
                  assistants={assistants}
                  teamMembers={teamMembers}
                  chatbots={chatbots}
                  whatsappAgents={whatsappAgents}
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
                assignedToName={getAssignedToName?.(activeTask.assigned_to)}
                chatbotName={getChatbotName?.(activeTask.chatbot_id)}
                whatsappAgentName={getWhatsappAgentName?.(activeTask.whatsapp_agent_id)}
                createdByName={getCreatedByName?.(activeTask.user_id)}
                onUpdate={onTaskUpdated}
                onDelete={onTaskDeleted}
                isDragging
                assistants={assistants}
                teamMembers={teamMembers}
                chatbots={chatbots}
                whatsappAgents={whatsappAgents}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
