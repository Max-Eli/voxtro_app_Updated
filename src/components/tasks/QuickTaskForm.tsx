import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuickTaskFormProps {
  assistantId?: string | null;
  assistantName?: string;
  orgId?: string | null;
  onTaskCreated?: (task: any) => void;
  placeholder?: string;
}

export const QuickTaskForm = ({
  assistantId,
  assistantName,
  orgId,
  onTaskCreated,
  placeholder = "Add a task and press Enter..."
}: QuickTaskFormProps) => {
  const { user } = useAuth();
  // Use persisted state to prevent data loss on tab switches
  const [title, setTitle, clearTitle] = usePersistedState("quickTaskForm_title", "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Insert into voice_assistant_tasks table
      const tasksResult = await supabase
        .from("voice_assistant_tasks")
        .insert({
          user_id: user.id,
          assistant_id: assistantId || null,
          org_id: orgId || null,
          title: title.trim(),
          priority: "medium",
          status: "pending",
        })
        .select()
        .single();

      if (tasksResult.error) throw tasksResult.error;

      // Only insert changelog entry if assistant is assigned
      if (assistantId) {
        await supabase.from('changelog_entries').insert({
          user_id: user.id,
          entity_type: 'voice_assistant',
          entity_id: assistantId,
          change_type: 'task',
          title: title.trim(),
          status: 'pending',
          source: 'manual',
        });
      }

      onTaskCreated?.(tasksResult.data);
      clearTitle(); // Clear persisted state on successful submission
      toast.success(assistantId ? `Task added for ${assistantName}` : "Task added (unassigned)");
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="flex-1"
      />
      <Button 
        type="submit" 
        size="sm" 
        disabled={isSubmitting || !title.trim()}
        className="shrink-0"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};
