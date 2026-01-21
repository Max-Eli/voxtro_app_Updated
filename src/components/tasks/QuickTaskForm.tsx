import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuickTaskFormProps {
  assistantId: string;
  assistantName: string;
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
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Insert into BOTH tables so it shows on both Tasks page AND Changelog page
      const [tasksResult, changelogResult] = await Promise.all([
        supabase
          .from("voice_assistant_tasks")
          .insert({
            user_id: user.id,
            assistant_id: assistantId,
            org_id: orgId,
            title: title.trim(),
            priority: "medium",
            status: "pending",
          })
          .select()
          .single(),
        supabase.from('changelog_entries').insert({
          user_id: user.id,
          entity_type: 'voice_assistant',
          entity_id: assistantId,
          change_type: 'task',
          title: title.trim(),
          status: 'pending',
          source: 'manual',
        })
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (changelogResult.error) throw changelogResult.error;

      onTaskCreated?.(tasksResult.data);
      setTitle("");
      toast.success(`Task added for ${assistantName}`);
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
