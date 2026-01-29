import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { Calendar, Pencil, Trash2, MoreVertical, Clock, AlertTriangle, Bot, MessageSquare, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Task } from "@/pages/VoiceAssistantTasks";
import { EditTaskDialog } from "./EditTaskDialog";

interface TaskCardProps {
  task: Task;
  assistantName: string;
  orgName: string;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onHide?: (taskId: string) => void;
  currentUserId?: string;
  chatbotName?: string;
  whatsappAgentName?: string;
  assignedToName?: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TaskCard = ({ task, assistantName, orgName, onUpdate, onDelete, onHide, currentUserId, chatbotName, whatsappAgentName, assignedToName }: TaskCardProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isOverdue =
    task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from("voice_assistant_tasks")
        .update({ status: newStatus })
        .eq("id", task.id)
        .select()
        .single();

      if (error) throw error;

      // Helper to create/update changelog entries for each agent type
      const updateChangelogForAgent = async (
        entityType: 'voice_assistant' | 'chatbot' | 'whatsapp_agent',
        entityId: string | null
      ) => {
        if (!entityId) return;

        if (newStatus === 'completed') {
          // First try to find existing entry
          const { data: existingEntry } = await supabase
            .from('changelog_entries')
            .select('id')
            .eq('entity_id', entityId)
            .eq('title', task.title)
            .eq('entity_type', entityType)
            .single();

          if (existingEntry) {
            // Update existing entry
            await supabase
              .from('changelog_entries')
              .update({ change_type: 'update', status: 'completed' })
              .eq('id', existingEntry.id);
          } else {
            // Create new changelog entry for completed task
            // Use currentUserId so any team member can create changelog entries
            await supabase.from('changelog_entries').insert({
              user_id: currentUserId || task.user_id,
              entity_type: entityType,
              entity_id: entityId,
              change_type: 'update',
              title: task.title,
              description: task.description,
              status: 'completed',
              source: 'manual',
            });
          }
        } else {
          // Update changelog entry status to match (if it exists)
          await supabase
            .from('changelog_entries')
            .update({ status: newStatus })
            .eq('entity_id', entityId)
            .eq('title', task.title)
            .eq('entity_type', entityType);
        }
      };

      // Update changelog for all assigned agents
      await Promise.all([
        updateChangelogForAgent('voice_assistant', task.assistant_id),
        updateChangelogForAgent('chatbot', task.chatbot_id),
        updateChangelogForAgent('whatsapp_agent', task.whatsapp_agent_id),
      ]);

      onUpdate(data);
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    // Check if this is a shared task and user is not the owner
    const isOwner = task.user_id === currentUserId;
    const isSharedTask = task.is_team_shared || task.assigned_to;

    try {
      if (isSharedTask && !isOwner) {
        // Hide the task for this user only
        const { error } = await supabase
          .from("task_hidden_by_users")
          .insert({ task_id: task.id, user_id: currentUserId });

        if (error) throw error;

        onHide?.(task.id);
        toast.success("Task removed from your view");
      } else {
        // Actually delete the task
        const { error } = await supabase
          .from("voice_assistant_tasks")
          .delete()
          .eq("id", task.id);

        if (error) throw error;

        onDelete(task.id);
        toast.success("Task deleted");
      }
    } catch (error) {
      console.error("Error deleting/hiding task:", error);
      toast.error("Failed to remove task");
    }
  };

  return (
    <>
      <Card className={`transition-all ${isOverdue ? "border-red-500/50" : ""}`}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Main Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-base">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteOpen(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
                {/* Assigned Agents */}
                {task.assistant_id && assistantName && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1 bg-purple-500/10 text-purple-400 border-purple-500/30">
                    <Bot className="h-3 w-3" />
                    {assistantName}
                  </Badge>
                )}
                {task.chatbot_id && chatbotName && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30">
                    <Bot className="h-3 w-3" />
                    {chatbotName}
                  </Badge>
                )}
                {task.whatsapp_agent_id && whatsappAgentName && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1 bg-green-500/10 text-green-400 border-green-500/30">
                    <MessageSquare className="h-3 w-3" />
                    {whatsappAgentName}
                  </Badge>
                )}
                {task.assigned_to && assignedToName && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1 bg-orange-500/10 text-orange-400 border-orange-500/30">
                    <User className="h-3 w-3" />
                    {assignedToName}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs bg-muted/50">
                  {orgName}
                </Badge>
                {task.due_date && (
                  <Badge
                    variant="outline"
                    className={`text-xs flex items-center gap-1 ${
                      isOverdue
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : isDueToday
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : ""
                    }`}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {format(new Date(task.due_date), "MMM d, yyyy")}
                  </Badge>
                )}
                {/* Creation timestamp */}
                <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
                </Badge>
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={task.status}
                onValueChange={handleStatusChange}
                disabled={isUpdating}
              >
                <SelectTrigger className={`w-[130px] h-8 text-xs ${statusColors[task.status]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditTaskDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        onUpdate={onUpdate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(task.is_team_shared || task.assigned_to) && task.user_id !== currentUserId
                ? "Remove Task"
                : "Delete Task"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(task.is_team_shared || task.assigned_to) && task.user_id !== currentUserId
                ? `This will remove "${task.title}" from your view only. Other team members will still see it.`
                : `Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {(task.is_team_shared || task.assigned_to) && task.user_id !== currentUserId
                ? "Remove"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};