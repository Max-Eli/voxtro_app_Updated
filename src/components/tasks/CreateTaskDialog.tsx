import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
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
  name: string | null;
  org_id: string | null;
}

interface VoiceConnection {
  id: string;
  org_id: string | null;
  org_name: string | null;
  is_active: boolean;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistants: VoiceAssistant[];
  connections: VoiceConnection[];
  onTaskCreated: (task: Task) => void;
  preSelectedAssistantId?: string | null;
}

export const CreateTaskDialog = ({
  open,
  onOpenChange,
  assistants,
  connections,
  onTaskCreated,
  preSelectedAssistantId,
}: CreateTaskDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // Set pre-selected assistant when dialog opens
  useEffect(() => {
    if (open && preSelectedAssistantId) {
      setAssistantId(preSelectedAssistantId);
    }
  }, [open, preSelectedAssistantId]);

  const selectedAssistant = assistants.find((a) => a.id === assistantId);
  const getOrgName = (orgId: string | null) => {
    if (!orgId) return "No Organization";
    const connection = connections.find((c) => c.org_id === orgId);
    return connection?.org_name || orgId;
  };

  // Group assistants by organization
  const groupedAssistants = assistants.reduce((acc, assistant) => {
    const orgName = getOrgName(assistant.org_id);
    if (!acc[orgName]) {
      acc[orgName] = [];
    }
    acc[orgName].push(assistant);
    return acc;
  }, {} as Record<string, VoiceAssistant[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assistantId) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("voice_assistant_tasks")
        .insert({
          user_id: user?.id,
          assistant_id: assistantId,
          org_id: selectedAssistant?.org_id,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          due_date: dueDate?.toISOString() || null,
        })
        .select()
        .single();

      if (error) throw error;

      onTaskCreated(data);
      toast.success("Task created successfully");
      resetForm();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssistantId("");
    setPriority("medium");
    setStatus("pending");
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assistant">Voice Assistant *</Label>
            <Select value={assistantId} onValueChange={setAssistantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedAssistants).map(([orgName, orgAssistants]) => (
                  <div key={orgName}>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {orgName}
                    </div>
                    {orgAssistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name || "Unnamed Assistant"}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
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
              <Label htmlFor="status">Initial Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a due date (optional)"}
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};