import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/pages/VoiceAssistantTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GripVertical, Trash2, Edit, ChevronDown, ChevronUp, Save, X, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskKanbanCardProps {
  task: Task;
  assistantName: string;
  orgName: string;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isDragging?: boolean;
}

const PRIORITY_COLORS = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const PRIORITY_BADGES = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function TaskKanbanCard({
  task,
  assistantName,
  orgName,
  onUpdate,
  onDelete,
  isDragging = false,
}: TaskKanbanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [saving, setSaving] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("voice_assistant_tasks")
        .update({
          title,
          description,
          priority,
          due_date: dueDate || null,
        })
        .eq("id", task.id);

      if (error) throw error;

      onUpdate({
        ...task,
        title,
        description,
        priority,
        due_date: dueDate || null,
      });

      toast.success("Task updated");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date || "");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase
        .from("voice_assistant_tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      onDelete(task.id);
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on buttons or drag handle
    if ((e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('[data-drag-handle]') ||
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('textarea') ||
        (e.target as HTMLElement).closest('[data-radix-select-trigger]')) {
      return;
    }
    if (!isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all hover:shadow-md",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg",
        isExpanded && "ring-1 ring-primary/20"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header - Always visible */}
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            data-drag-handle
            className="mt-1 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={handleCardClick}
          >
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
            {!isExpanded && task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Collapsed view - Priority and due date */}
        {!isExpanded && (
          <div className="flex items-center gap-2 flex-wrap pl-6">
            <Badge variant="secondary" className={cn("text-xs", PRIORITY_BADGES[task.priority as keyof typeof PRIORITY_BADGES])}>
              {task.priority}
            </Badge>

            {task.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), "MMM d")}
              </div>
            )}
          </div>
        )}

        {/* Expanded view - Full details */}
        {isExpanded && (
          <div className="pl-6 space-y-4 pt-2 border-t mt-2">
            {isEditing ? (
              // Editing mode
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task description"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-7 text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="space-y-3">
                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">
                    {task.description || <span className="text-muted-foreground italic">No description</span>}
                  </p>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Badge variant="secondary" className={cn("text-xs", PRIORITY_BADGES[task.priority as keyof typeof PRIORITY_BADGES])}>
                      {task.priority}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <p className="text-sm">
                      {task.due_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.due_date), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">No due date</span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Assistant</Label>
                    <p className="text-sm flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {assistantName}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Organization</Label>
                    <p className="text-sm flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {orgName}
                    </p>
                  </div>
                </div>

                {/* Created/Updated dates */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Created: {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  {task.updated_at !== task.created_at && (
                    <p>Updated: {format(new Date(task.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
