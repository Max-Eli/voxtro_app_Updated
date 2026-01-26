import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Task } from "@/pages/VoiceAssistantTasks";

interface VoiceAssistant {
  id: string;
  name: string;
  org_id: string;
}

interface TeamMember {
  user_id: string;
  email?: string;
  user_name?: string;
}

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  onUpdate: (task: Task) => void;
}

export const EditTaskDialog = ({
  open,
  onOpenChange,
  task,
  onUpdate,
}: EditTaskDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [assistantId, setAssistantId] = useState(task.assistant_id || "__unassigned__");
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || "__unassigned__");
  const [assistants, setAssistants] = useState<VoiceAssistant[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setAssistantId(task.assistant_id || "__unassigned__");
      setAssignedTo(task.assigned_to || "__unassigned__");
      fetchAssistantsAndTeamMembers();
    }
  }, [open, task]);

  const fetchAssistantsAndTeamMembers = async () => {
    setLoadingData(true);
    try {
      // Fetch voice assistants
      const { data: assistantsData } = await supabase
        .from("voice_assistants")
        .select("id, name, org_id")
        .order("name");

      if (assistantsData) {
        setAssistants(assistantsData);
      }

      // Fetch team members from user's teams
      const { data: membersData } = await supabase
        .from("team_members")
        .select("user_id, email");

      if (membersData) {
        // Get unique members and fetch their profiles
        const uniqueUserIds = [...new Set(membersData.map(m => m.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", uniqueUserIds);

        const membersWithNames = uniqueUserIds.map(userId => {
          const member = membersData.find(m => m.user_id === userId);
          const profile = profilesData?.find(p => p.user_id === userId);
          return {
            user_id: userId,
            email: member?.email || profile?.email,
            user_name: profile?.full_name,
          };
        });

        setTeamMembers(membersWithNames);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("voice_assistant_tasks")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          due_date: dueDate?.toISOString() || null,
          assistant_id: assistantId === "__unassigned__" ? null : assistantId,
          assigned_to: assignedTo === "__unassigned__" ? null : assignedTo,
        })
        .eq("id", task.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      toast.success("Task updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearDueDate = () => {
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="edit-assistant">Voice Assistant</Label>
            <Select value={assistantId} onValueChange={setAssistantId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingData ? "Loading..." : "Select assistant"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                {assistants.filter(a => a.id).map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <span>{assistant.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assigned-to">Assign to Team Member</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder={loadingData ? "Loading..." : "Select team member"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                {teamMembers.filter(m => m.user_id).map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{member.user_name || member.email || member.user_id}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button type="button" variant="outline" onClick={clearDueDate}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};