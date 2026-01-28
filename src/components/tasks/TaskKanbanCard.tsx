import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/pages/VoiceAssistantTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GripVertical, Trash2, Edit, ChevronDown, ChevronUp, Save, X, User, Building2, MoreVertical, Bot, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

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

interface TaskKanbanCardProps {
  task: Task;
  assistantName: string;
  orgName: string;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onHide?: (taskId: string) => void;
  currentUserId?: string;
  isDragging?: boolean;
  assistants?: Assistant[];
  teamMembers?: TeamMember[];
  chatbots?: Chatbot[];
  whatsappAgents?: WhatsAppAgent[];
  assignedToName?: string;
  chatbotName?: string;
  whatsappAgentName?: string;
  createdByName?: string;
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
  onHide,
  currentUserId,
  isDragging = false,
  assistants = [],
  teamMembers = [],
  chatbots = [],
  whatsappAgents = [],
  assignedToName,
  chatbotName,
  whatsappAgentName,
  createdByName,
}: TaskKanbanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [assistantId, setAssistantId] = useState(task.assistant_id || "");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "");
  const [chatbotId, setChatbotId] = useState(task.chatbot_id || "");
  const [whatsappAgentId, setWhatsappAgentId] = useState(task.whatsapp_agent_id || "");
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

  // Memoized options for searchable selects
  const assistantOptions = useMemo(() => [
    { value: "__unassigned__", label: "Unassigned", icon: <Bot className="h-4 w-4 text-muted-foreground" /> },
    ...assistants.filter(a => a.id).map((assistant) => ({
      value: assistant.id,
      label: assistant.name || "Unnamed Assistant",
      icon: <Bot className="h-4 w-4" />,
    })),
  ], [assistants]);

  const teamMemberOptions = useMemo(() => [
    { value: "__unassigned__", label: "Unassigned", icon: <User className="h-4 w-4 text-muted-foreground" /> },
    ...teamMembers.filter(m => m.user_id).map((member) => ({
      value: member.user_id,
      label: member.user_name || member.email || member.user_id,
      icon: <User className="h-4 w-4" />,
    })),
  ], [teamMembers]);

  const chatbotOptions = useMemo(() => [
    { value: "__unassigned__", label: "Unassigned", icon: <Bot className="h-4 w-4 text-muted-foreground" /> },
    ...chatbots.filter(c => c.id).map((chatbot) => ({
      value: chatbot.id,
      label: chatbot.name || "Unnamed Chatbot",
      icon: <Bot className="h-4 w-4" />,
    })),
  ], [chatbots]);

  const whatsappAgentOptions = useMemo(() => [
    { value: "__unassigned__", label: "Unassigned", icon: <MessageSquare className="h-4 w-4 text-muted-foreground" /> },
    ...whatsappAgents.filter(a => a.id).map((agent) => ({
      value: agent.id,
      label: agent.name || agent.phone_number || "Unnamed Agent",
      icon: <MessageSquare className="h-4 w-4" />,
    })),
  ], [whatsappAgents]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedAssistant = assistants.find(a => a.id === assistantId);
      const { error } = await supabase
        .from("voice_assistant_tasks")
        .update({
          title,
          description,
          priority,
          due_date: dueDate || null,
          assistant_id: assistantId || null,
          org_id: selectedAssistant?.org_id || null,
          assigned_to: assignedTo || null,
          chatbot_id: chatbotId || null,
          whatsapp_agent_id: whatsappAgentId || null,
        })
        .eq("id", task.id);

      if (error) throw error;

      onUpdate({
        ...task,
        title,
        description,
        priority,
        due_date: dueDate || null,
        assistant_id: assistantId || null,
        org_id: selectedAssistant?.org_id || null,
        assigned_to: assignedTo || null,
        chatbot_id: chatbotId || null,
        whatsapp_agent_id: whatsappAgentId || null,
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
    setAssistantId(task.assistant_id || "");
    setAssignedTo(task.assigned_to || "");
    setChatbotId(task.chatbot_id || "");
    setWhatsappAgentId(task.whatsapp_agent_id || "");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    // Check if this is a shared task and user is not the owner
    const isOwner = task.user_id === currentUserId;
    const isSharedTask = task.is_team_shared || task.assigned_to;

    // Different confirmation message based on ownership
    const confirmMessage = isSharedTask && !isOwner
      ? "This will remove the task from your view only. Other team members will still see it. Continue?"
      : "Are you sure you want to delete this task? This action cannot be undone.";

    if (!confirm(confirmMessage)) return;

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on buttons, drag handle, or dropdown
    if ((e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('[data-drag-handle]') ||
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('textarea') ||
        (e.target as HTMLElement).closest('[data-radix-select-trigger]') ||
        (e.target as HTMLElement).closest('[role="menu"]')) {
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
          {/* Quick Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setIsExpanded(true); setIsEditing(true); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

                <div className="space-y-1.5">
                  <Label className="text-xs">Assistant</Label>
                  <SearchableSelect
                    options={assistantOptions}
                    value={assistantId || "__unassigned__"}
                    onValueChange={(val) => setAssistantId(val === "__unassigned__" ? "" : val)}
                    placeholder="Select assistant"
                    searchPlaceholder="Search assistants..."
                    emptyMessage="No assistants found."
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Assign to Team Member</Label>
                  <SearchableSelect
                    options={teamMemberOptions}
                    value={assignedTo || "__unassigned__"}
                    onValueChange={(val) => setAssignedTo(val === "__unassigned__" ? "" : val)}
                    placeholder="Select team member"
                    searchPlaceholder="Search team members..."
                    emptyMessage="No team members found."
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Chatbot</Label>
                  <SearchableSelect
                    options={chatbotOptions}
                    value={chatbotId || "__unassigned__"}
                    onValueChange={(val) => setChatbotId(val === "__unassigned__" ? "" : val)}
                    placeholder="Select chatbot"
                    searchPlaceholder="Search chatbots..."
                    emptyMessage="No chatbots found."
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">WhatsApp Agent</Label>
                  <SearchableSelect
                    options={whatsappAgentOptions}
                    value={whatsappAgentId || "__unassigned__"}
                    onValueChange={(val) => setWhatsappAgentId(val === "__unassigned__" ? "" : val)}
                    placeholder="Select WhatsApp agent"
                    searchPlaceholder="Search WhatsApp agents..."
                    emptyMessage="No WhatsApp agents found."
                    className="h-8 text-sm"
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

                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Assigned To</Label>
                    <p className="text-sm flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {assignedToName || <span className="text-muted-foreground italic">Unassigned</span>}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Chatbot</Label>
                    <p className="text-sm flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      {chatbotName || <span className="text-muted-foreground italic">Unassigned</span>}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">WhatsApp Agent</Label>
                    <p className="text-sm flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {whatsappAgentName || <span className="text-muted-foreground italic">Unassigned</span>}
                    </p>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Created By</Label>
                    <p className="text-sm flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {createdByName || <span className="text-muted-foreground italic">Unknown</span>}
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
