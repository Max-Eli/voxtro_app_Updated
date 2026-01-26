import { useState, useEffect } from "react";
import { CheckSquare, Clock, AlertCircle, CheckCircle, Loader2, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

interface TeamMember {
  user_id: string;
  email?: string;
  user_name?: string;
}

export interface Task {
  id: string;
  user_id: string;
  assistant_id: string | null;
  org_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  team_org_id: string | null;
  is_team_shared: boolean;
  assigned_to: string | null;
}

const VoiceAssistantTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assistants, setAssistants] = useState<VoiceAssistant[]>([]);
  const [connections, setConnections] = useState<VoiceConnection[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
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

      // Fetch team members for assignment
      const { data: membersData } = await supabase
        .from("team_members")
        .select("user_id, email");

      if (membersData) {
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

      // Fetch tasks (RLS policy handles filtering for owned/assigned/team tasks)
      const { data: tasksData, error } = await supabase
        .from("voice_assistant_tasks")
        .select("*")
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

  const getAssistantName = (assistantId: string | null) => {
    if (!assistantId) return "Unassigned";
    const assistant = assistants.find((a) => a.id === assistantId);
    return assistant?.name || "Unknown Assistant";
  };

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return "No Organization";
    const connection = connections.find((c) => c.org_id === orgId);
    return connection?.org_name || orgId;
  };

  const getAssignedToName = (userId: string | null) => {
    if (!userId) return "";
    const member = teamMembers.find((m) => m.user_id === userId);
    return member?.user_name || member?.email || userId;
  };

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
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0 mb-4">
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
      <Card className="flex-shrink-0 mb-4 border-dashed">
        <CardContent className="pt-4">
          <QuickTaskForm
            onTaskCreated={handleTaskCreated}
            placeholder="What needs to be done? Press Enter to add..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Click on a task to assign it to an assistant
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-shrink-0 mb-4">
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
        <Card className="flex-shrink-0 mb-4">
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

      {/* Tasks Display - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            getAssistantName={getAssistantName}
            getOrgName={getOrgName}
            getAssignedToName={getAssignedToName}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
            assistants={assistants}
            teamMembers={teamMembers}
          />
        ) : (
          <div className="space-y-4 h-full overflow-y-auto pr-2">
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
    </div>
  );
};

export default VoiceAssistantTasks;
