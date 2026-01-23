import { useState, useEffect } from "react";
import { CheckSquare, Clock, AlertCircle, CheckCircle, Loader2, ChevronsUpDown, Check, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AssistantSearchPreview } from "@/components/tasks/AssistantSearchPreview";
import { QuickTaskForm } from "@/components/tasks/QuickTaskForm";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
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

export interface Task {
  id: string;
  user_id: string;
  assistant_id: string;
  org_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const VoiceAssistantTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assistants, setAssistants] = useState<VoiceAssistant[]>([]);
  const [connections, setConnections] = useState<VoiceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [assistantDropdownOpen, setAssistantDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch connections
      const { data: connectionsData } = await supabase
        .from("voice_connections")
        .select("*")
        .eq("user_id", user?.id);

      setConnections(connectionsData || []);

      // Fetch assistants
      const { data: assistantsData } = await supabase
        .from("voice_assistants")
        .select("id, name, org_id")
        .eq("user_id", user?.id);

      setAssistants(assistantsData || []);
      
      // Auto-select first assistant if none selected
      if (assistantsData && assistantsData.length > 0 && !selectedAssistantId) {
        setSelectedAssistantId(assistantsData[0].id);
      }

      // Fetch tasks
      const { data: tasksData, error } = await supabase
        .from("voice_assistant_tasks")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(tasksData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const getAssistantName = (assistantId: string) => {
    const assistant = assistants.find((a) => a.id === assistantId);
    return assistant?.name || "Unknown Assistant";
  };

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return "No Organization";
    const connection = connections.find((c) => c.org_id === orgId);
    return connection?.org_name || orgId;
  };

  const selectedAssistant = assistants.find((a) => a.id === selectedAssistantId);

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      const assistantName = getAssistantName(task.assistant_id).toLowerCase();
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        (task.description?.toLowerCase().includes(searchLower) ?? false) ||
        assistantName.includes(searchLower);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesOrg = orgFilter === "all" || task.org_id === orgFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesOrg;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "due_date":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
        case "created_at":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Manager</h1>
          <p className="text-muted-foreground">
            Manage tasks for your voice assistants across all organizations
          </p>
        </div>
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {/* Quick Add Task */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Popover open={assistantDropdownOpen} onOpenChange={setAssistantDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assistantDropdownOpen}
                    className="w-[250px] justify-between"
                  >
                    <span className="truncate">
                      {selectedAssistantId
                        ? assistants.find((a) => a.id === selectedAssistantId)?.name || "Unnamed Assistant"
                        : "Select assistant..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search assistant..." />
                    <CommandList>
                      <CommandEmpty>No assistant found.</CommandEmpty>
                      <CommandGroup>
                        {assistants.map((assistant) => (
                          <CommandItem
                            key={assistant.id}
                            value={assistant.name || "Unnamed Assistant"}
                            onSelect={() => {
                              setSelectedAssistantId(assistant.id);
                              setAssistantDropdownOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                selectedAssistantId === assistant.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{assistant.name || "Unnamed Assistant"}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex-1">
                <QuickTaskForm
                  assistantId={selectedAssistantId}
                  assistantName={selectedAssistant?.name || "Assistant"}
                  orgId={selectedAssistant?.org_id}
                  onTaskCreated={handleTaskCreated}
                  placeholder="Type a task and press Enter..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <AssistantSearchPreview
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                assistants={assistants}
                connections={connections}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {connections
                  .filter((conn) => conn.org_id)
                  .map((conn) => (
                    <SelectItem key={conn.id} value={conn.org_id!}>
                      {conn.org_name || conn.org_id || "Unknown"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest First</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Tasks Display */}
      {viewMode === "kanban" ? (
        <TaskKanbanBoard
          tasks={filteredTasks}
          getAssistantName={getAssistantName}
          getOrgName={getOrgName}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      ) : (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                <p className="text-muted-foreground text-center">
                  {tasks.length === 0
                    ? "Use the quick add above to create your first task"
                    : "No tasks match your current filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assistantName={getAssistantName(task.assistant_id)}
                orgName={getOrgName(task.org_id)}
                onUpdate={handleTaskUpdated}
                onDelete={handleTaskDeleted}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceAssistantTasks;
